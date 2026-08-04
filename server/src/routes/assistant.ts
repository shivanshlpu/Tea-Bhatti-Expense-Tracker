import { Router, Request, Response, NextFunction } from 'express';
import { AskQuestionSchema } from '@shop-finance/shared';
import { matchIntent } from '../assistant/intentMatcher';
import { extractSlots } from '../assistant/slotExtractor';
import { composeAnswer, getFallbackAnswer } from '../assistant/answerComposer';
import { authenticate } from '../middleware/auth';
import { assistantRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

// Tappable example chips from SRS Section 6.2
const EXAMPLE_CHIPS = [
  'Aaj ka total sale kitna hua?',
  'Net profit kitna hai this month?',
  'Abhi cash mein kitna balance hai?',
  'Kiraya (Rent) kitna gaya is mahine?',
  'Loan repayment kitna gaya is mahine?',
  'Pichhle hafte ka withdrawal kitna tha?',
];

/**
 * POST /api/assistant/ask
 * Rule-based query assistant endpoint. $0 cost forever.
 */
router.post('/ask', assistantRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = AskQuestionSchema.parse(req.body);
    const { question } = input;

    // 1. Intent Matching
    const { intent } = matchIntent(question);

    if (!intent) {
      const fallback = getFallbackAnswer();
      res.json({
        success: true,
        data: {
          answer: fallback.answer,
          figures: fallback.figures,
          matchedIntent: fallback.matchedIntent,
          exampleChips: EXAMPLE_CHIPS,
        },
      });
      return;
    }

    // 2. Slot Extraction (dates + categories)
    const slots = extractSlots(question);

    // 3. Answer Composition via financeEngine
    const result = await composeAnswer(req.user!.shopId, intent, slots);

    res.json({
      success: true,
      data: {
        ...result,
        exampleChips: EXAMPLE_CHIPS,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
