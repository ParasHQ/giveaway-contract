import { VMContext } from 'near-sdk-as'
import {
	addParticipant,
	drawWinners,
	getGiveaway,
	getGiveawayList,
	getParticipants,
	getWinners,
	giveawayList,
	newGiveaway,
} from '../main'

const alice = 'alice'
const bob = 'bob'
const carol = 'carol'
const denise = 'denise'
const elijah = 'elijah'

describe('Giveaway ', () => {
	beforeEach(() => {})

	it('should create & get new giveaway', () => {
		VMContext.setPredecessor_account_id(alice)
		const id = newGiveaway('abc', 'abc', '123', '456')
		expect(id).toBe('abc')

		const giveaway = getGiveaway('abc')
		if (giveaway) {
			expect(giveaway.name).toBe('abc')
			expect(giveaway.startDate).toBe('123')
			expect(giveaway.endDate).toBe('456')
			expect(giveaway.owner).toBe(alice)
		}

		giveawayList.clear()
	})

	it('should get giveaway list', () => {
		VMContext.setPredecessor_account_id(alice)
		const id = newGiveaway('abc', 'abc', '123', '456')
		expect(id).toBe('abc')

		VMContext.setPredecessor_account_id(bob)
		const id2 = newGiveaway('def', 'def', '123', '456')
		expect(id2).toBe('def')

		const giveaway = getGiveawayList(0, 10)

		expect(giveaway.length).toBe(2)
	})

	it('should add participant', () => {
		VMContext.setPredecessor_account_id(alice)
		const id = newGiveaway('abc', 'abc', '123', '456')
		expect(id).toBe('abc')

		addParticipant('abc', bob)
		addParticipant('abc', carol)
		addParticipant('abc', denise)
		addParticipant('abc', elijah)

		const pList = getParticipants('abc', 0, 10)
    expect(pList).toHaveLength(4)
    
		drawWinners('abc', 2)
		const wList = getWinners('abc', 2)
		expect(wList).toHaveLength(2)
	})
})
