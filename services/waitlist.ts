import { DB } from "../dbConfig";
import {
  waitlist,
  REFERRAL_POINTS,
  SOCIAL_SHARE_POINTS,
  MILESTONE_POINTS,
  MILESTONES,
} from "../shared/schema";
import { eq, sql, desc } from "drizzle-orm";

export class WaitlistService {
  private static instance: WaitlistService;
  private positionUpdateQueue: Set<number>;
  private processingQueue: boolean;

  private constructor() {
    this.positionUpdateQueue = new Set();
    this.processingQueue = false;
  }

  public static getInstance(): WaitlistService {
    if (!WaitlistService.instance) {
      WaitlistService.instance = new WaitlistService();
    }
    return WaitlistService.instance;
  }

  async generateReferralCode(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 6);
    const random = Math.random().toString(36).substring(2, 8);
    return `${base}${random}`;
  }

  async addToQueue(userId: number) {
    this.positionUpdateQueue.add(userId);
    if (!this.processingQueue) {
      await this.processQueue();
    }
  }

  private async processQueue() {
    if (this.positionUpdateQueue.size === 0 || this.processingQueue) {
      return;
    }

    this.processingQueue = true;
    const batch = Array.from(this.positionUpdateQueue);
    this.positionUpdateQueue.clear();

    try {
      // Update positions in batch
      await DB.transaction(async (tx) => {
        for (const userId of batch) {
          const user = await tx.query.waitlist.findFirst({
            where: eq(waitlist.id, userId),
          });

          if (!user) continue;

          // Recalculate position based on points
          const newPosition = await this.calculateNewPosition(tx, user);

          // Update user's position
          await tx
            .update(waitlist)
            .set({
              position: newPosition,
              lastPositionUpdate: new Date(),
            })
            .where(eq(waitlist.id, userId));

          // Send notifications
          await this.sendPositionUpdateNotification(user.email, newPosition);
        }
      });
    } catch (error) {
      console.error("Error processing position updates:", error);
    } finally {
      this.processingQueue = false;

      // If new items were added during processing, process them
      if (this.positionUpdateQueue.size > 0) {
        await this.processQueue();
      }
    }
  }

  private async calculateNewPosition(tx: any, user: any): Promise<number> {
    const basePosition = user.createdAt.getTime();
    const pointsBonus = user.pointsEarned * -1000; // Higher points = lower position number
    return basePosition + pointsBonus;
  }

  private async sendPositionUpdateNotification(
    email: string,
    newPosition: number
  ) {
    try {
      // await sgMail.send({
      //   to: email,
      //   from: "waitlist@humoni.com",
      //   subject: "Your Waitlist Position Has Changed!",
      //   text: `Great news! Your position has been updated to ${newPosition}. Keep referring friends to move up the list!`,
      //   html: `
      //     <div>
      //       <h2>Great news!</h2>
      //       <p>Your position has been updated to <strong>${newPosition}</strong>.</p>
      //       <p>Keep referring friends to move up the list!</p>
      //     </div>
      //   `,
      // });
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  }

  async addPoints(userId: number, points: number, milestone?: string) {
    await DB.transaction(async (tx) => {
      const user = await tx.query.waitlist.findFirst({
        where: eq(waitlist.id, userId),
      });

      if (!user) return;

      const newPoints = user.pointsEarned + points;
      const milestones = user.milestones || [];

      if (milestone && !milestones.includes(milestone)) {
        milestones.push(milestone);
      }

      await tx
        .update(waitlist)
        .set({
          pointsEarned: newPoints,
          milestones: milestones,
        })
        .where(eq(waitlist.id, userId));

      await this.addToQueue(userId);
    });
  }

  async processReferral(referralCode: string) {
    const referrer = await DB.query.waitlist.findFirst({
      where: eq(waitlist.referralCode, referralCode),
    });

    if (!referrer) return;

    await DB.transaction(async (tx) => {
      // Update referral count
      await tx
        .update(waitlist)
        .set({
          referralCount: sql`${waitlist.referralCount} + 1`,
        })
        .where(eq(waitlist.id, referrer.id));

      // Add points for the referral
      await this.addPoints(
        referrer.id,
        REFERRAL_POINTS,
        referrer.referralCount === 0
          ? MILESTONES.FIRST_REFERRAL
          : referrer.referralCount === 4
          ? MILESTONES.FIVE_REFERRALS
          : referrer.referralCount === 9
          ? MILESTONES.TEN_REFERRALS
          : undefined
      );
    });
  }

  async recordSocialShare(userId: number) {
    await this.addPoints(userId, SOCIAL_SHARE_POINTS);
  }
}

export const waitlistService = WaitlistService.getInstance();
