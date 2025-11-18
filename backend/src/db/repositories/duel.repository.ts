import { getDatabase } from '../connection.js';
import type { Duel, NewDuel, DuelUpdate } from '../schema.js';
import { v4 as uuidv4 } from 'uuid';

export class DuelRepository {
  async create(duelData: Omit<NewDuel, 'duel_id'>): Promise<Duel> {
    const db = getDatabase();

    const duel = await db
      .insertInto('duels')
      .values({
        duel_id: uuidv4(),
        ...duelData,
        created_at: new Date().toISOString()
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return duel;
  }

  async findById(duelId: string): Promise<Duel | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('duels')
      .selectAll()
      .where('duel_id', '=', duelId)
      .executeTakeFirst();
  }

  async update(duelId: string, updates: DuelUpdate): Promise<Duel> {
    const db = getDatabase();
    return db
      .updateTable('duels')
      .set(updates)
      .where('duel_id', '=', duelId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findPendingDuelForOpponent(opponentId: string): Promise<Duel | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('duels')
      .selectAll()
      .where('opponent_id', '=', opponentId)
      .where('status', '=', 'PENDING')
      .orderBy('created_at', 'desc')
      .executeTakeFirst();
  }

  async findActiveDuelForUser(userId: string): Promise<Duel | undefined> {
    const db = getDatabase();
    return db
      .selectFrom('duels')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb('challenger_id', '=', userId),
          eb('opponent_id', '=', userId)
        ])
      )
      .where('status', '=', 'ACTIVE')
      .orderBy('started_at', 'desc')
      .executeTakeFirst();
  }

  async findDuelsForUser(userId: string, limit: number = 10): Promise<Duel[]> {
    const db = getDatabase();
    return db
      .selectFrom('duels')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb('challenger_id', '=', userId),
          eb('opponent_id', '=', userId)
        ])
      )
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();
  }

  async getUserDuelStats(userId: string): Promise<{
    total_duels: number;
    wins: number;
    losses: number;
    active: number;
    pending: number;
  }> {
    const db = getDatabase();

    const duels = await db
      .selectFrom('duels')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb('challenger_id', '=', userId),
          eb('opponent_id', '=', userId)
        ])
      )
      .execute();

    const stats = {
      total_duels: duels.filter(d => d.status === 'COMPLETED').length,
      wins: duels.filter(d => d.status === 'COMPLETED' && d.winner_id === userId).length,
      losses: duels.filter(d => d.status === 'COMPLETED' && d.winner_id !== userId && d.winner_id !== null).length,
      active: duels.filter(d => d.status === 'ACTIVE').length,
      pending: duels.filter(d => d.status === 'PENDING' && d.opponent_id === userId).length
    };

    return stats;
  }

  async getRecentDuelWins(userId: string, limit: number = 5): Promise<Duel[]> {
    const db = getDatabase();
    return db
      .selectFrom('duels')
      .selectAll()
      .where('winner_id', '=', userId)
      .where('status', '=', 'COMPLETED')
      .orderBy('completed_at', 'desc')
      .limit(limit)
      .execute();
  }

  async getConsecutiveWins(userId: string): Promise<number> {
    const db = getDatabase();

    const recentDuels = await db
      .selectFrom('duels')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb('challenger_id', '=', userId),
          eb('opponent_id', '=', userId)
        ])
      )
      .where('status', '=', 'COMPLETED')
      .orderBy('completed_at', 'desc')
      .execute();

    let consecutiveWins = 0;
    for (const duel of recentDuels) {
      if (duel.winner_id === userId) {
        consecutiveWins++;
      } else {
        break;
      }
    }

    return consecutiveWins;
  }

  async cancelDuel(duelId: string): Promise<Duel> {
    return this.update(duelId, {
      status: 'CANCELLED',
      completed_at: new Date().toISOString()
    });
  }

  async declineDuel(duelId: string): Promise<Duel> {
    return this.update(duelId, {
      status: 'DECLINED',
      completed_at: new Date().toISOString()
    });
  }

  async acceptDuel(duelId: string): Promise<Duel> {
    return this.update(duelId, {
      status: 'ACTIVE',
      started_at: new Date().toISOString()
    });
  }

  async completeDuel(duelId: string, winnerId: string): Promise<Duel> {
    return this.update(duelId, {
      status: 'COMPLETED',
      winner_id: winnerId,
      completed_at: new Date().toISOString()
    });
  }

  async recordSolveTime(
    duelId: string,
    userId: string,
    solveTime: Date
  ): Promise<Duel> {
    const duel = await this.findById(duelId);
    if (!duel) {
      throw new Error('Duel not found');
    }

    const timeStr = solveTime.toISOString();

    if (duel.challenger_id === userId) {
      return this.update(duelId, { challenger_solve_time: timeStr });
    } else if (duel.opponent_id === userId) {
      return this.update(duelId, { opponent_solve_time: timeStr });
    } else {
      throw new Error('User is not part of this duel');
    }
  }
}
