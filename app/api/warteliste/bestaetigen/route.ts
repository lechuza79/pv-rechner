import { waitlistAction } from '../../../../lib/offer-waitlist-action';
export const dynamic = 'force-dynamic';
export const GET = (req: Request) => waitlistAction(req, false);
export const POST = GET;
