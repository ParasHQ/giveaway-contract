import {
	context,
	PersistentMap,
	PersistentUnorderedMap,
	PersistentVector,
	RNG,
} from 'near-sdk-as'

export const ERROR_GIVEAWAY_ID_EXIST = 'Giveaway: ID already exist'
export const ERROR_GIVEAWAY_ID_NOT_EXIST = 'Giveaway: ID not exist'
export const ERROR_GIVEAWAY_OWNER_ONLY = 'Giveaway: Sender not giveaway owner'
export const ERROR_GIVEAWAY_DRAW_EXIST = 'Giveaway: Winners have been drawn'
export const ERROR_GIVEAWAY_DRAW_NOT_EXIST =
	'Giveaway: Winners have not been drawn'

const MAX_LENGTH = 10

export type GiveawayId = string
export type ParticipantId = string

@nearBindgen
export class Giveaway {
	id: string
	name: string
	startDate: string
	endDate: string
	owner: string
	drawDate: string
	winnersCount: u32

	constructor(
		id: string,
		name: string,
		startDate: string,
		endDate: string,
		owner: string
	) {
		this.id = id
		this.name = name
		this.startDate = startDate
		this.endDate = endDate
		this.owner = owner
		this.drawDate = ''
		this.winnersCount = 0
	}
}

export const giveawayList = new PersistentUnorderedMap<GiveawayId, Giveaway>(
	'g1'
)
export const participantTracker = new PersistentMap<string, string>('pV1')

export const participantList = new PersistentMap<
	GiveawayId,
	PersistentVector<string>
>('pI1')

export function createGiveaway(
	id: string,
	name: string,
	startDate: string,
	endDate: string
): string {
	// check if ID already exist
	const exist = giveawayList.get(id)
	assert(!exist, ERROR_GIVEAWAY_ID_EXIST)

	// create new giveaway instance
	const owner = context.predecessor
	const giveaway = new Giveaway(id, name, startDate, endDate, owner)

	// add to list
	giveawayList.set(id, giveaway)

	return id
}

export function getGiveaway(id: string): Giveaway | null {
	const giveaway = giveawayList.get(id)
	return giveaway
}

export function getGiveawayList(start: i32, end: i32): Giveaway[] {
	if (end > start + MAX_LENGTH) {
		return giveawayList.values(start, start + MAX_LENGTH)
	}

	return giveawayList.values(start, end)
}

export function addParticipant(giveawayId: string, accountId: string): string {
	const owner = context.predecessor
	const giveaway = getGiveaway(giveawayId)

	// check if giveaway id exist
	assert(giveaway, ERROR_GIVEAWAY_ID_NOT_EXIST)

	// check if sender is giveaway owner
	assert(giveaway && giveaway.owner == owner, ERROR_GIVEAWAY_OWNER_ONLY)

	// check if account id already registered on giveaway
	const trackerKey = giveawayId + '::' + accountId
	const participantExist = participantTracker.get(trackerKey)
	if (participantExist) {
		return accountId
	}

	const gaParticipantListExist = participantList.get(giveawayId)
	if (gaParticipantListExist) {
		gaParticipantListExist.push(accountId)
		participantList.set(giveawayId, gaParticipantListExist)
	} else {
		const newList = new PersistentVector<string>(giveawayId)
		newList.push(accountId)
		participantList.set(giveawayId, newList)
	}
	participantTracker.set(trackerKey, 'ok')

	return accountId
}

export function addParticipantBulk(
	giveawayId: string,
	accountIds: string[]
): string[] {
	for (let i = 0; i < accountIds.length; i++) {
		const accountId = accountIds[i]
		addParticipant(giveawayId, accountId)
	}
	return accountIds
}

export function getParticipants(
	giveawayId: string,
	start: i32,
	end: i32
): string[] {
	const gaParticipantListExist = participantList.get(giveawayId)
	if (!gaParticipantListExist) {
		return []
	}

	let results: string[] = []
	
	const maxEnd = start + MAX_LENGTH
	const n = end > maxEnd ? maxEnd : min(end, gaParticipantListExist.length)

	for (let i = start; i < n; i++) {
		results.push(gaParticipantListExist[i])
	}

	return results
}

export function getWinners(giveawayId: string, start: i32, end: i32): string[] {
	const giveaway = getGiveaway(giveawayId)

	// check if giveaway id exist
	assert(giveaway, ERROR_GIVEAWAY_ID_NOT_EXIST)

	// check if giveaway has been drawn
	assert(
		giveaway && giveaway.drawDate.length > 0,
		ERROR_GIVEAWAY_DRAW_NOT_EXIST
	)

	if (giveaway) {
		return getParticipants(giveawayId, start, min(end, giveaway.winnersCount))
	}

	return []
}

// export function removeParticipants() {}

export function drawWinners(giveawayId: string, length: u32): string[] {
	const owner = context.predecessor
	const giveaway = getGiveaway(giveawayId)

	// check if giveaway id exist
	assert(giveaway, ERROR_GIVEAWAY_ID_NOT_EXIST)

	// check if sender is giveaway owner
	assert(giveaway && giveaway.owner == owner, ERROR_GIVEAWAY_OWNER_ONLY)

	assert(giveaway && giveaway.drawDate.length == 0, ERROR_GIVEAWAY_DRAW_EXIST)

	const gaParticipantListExist = participantList.get(giveawayId)

	if (giveaway && gaParticipantListExist) {
		const ts = context.blockTimestamp
		const buffLen: u32 = u32((ts % gaParticipantListExist.length) + 1)
		const rng = new RNG<u16>(buffLen, gaParticipantListExist.length)

		for (let i = 0; i < i32(length); i++) {
			const swapIdx = rng.next()

			const p1 = gaParticipantListExist[i]
			const p2 = gaParticipantListExist[swapIdx]

			gaParticipantListExist.replace(i, p2)
			gaParticipantListExist.replace(swapIdx, p1)
		}
		giveaway.drawDate = ts.toString()
		giveaway.winnersCount = length
		giveawayList.set(giveawayId, giveaway)
		return getWinners(giveawayId, 0, length)
	}
	return []
}
