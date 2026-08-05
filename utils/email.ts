import 'server-only';
import { Resend } from 'resend';

// Club mail — welcome, apology, and ban notices via Resend (domain
// verified on smartscott.online). Best-effort everywhere: mail must never
// fail the webhook or a report action.

const resend = new Resend(process.env.RESEND_API_KEY || '');

const FROM = `Club Cheeky <no-reply@${process.env.REGISTERED_DOMAIN ?? 'smartscott.online'}>`;

export async function sendClubMail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean }> {
  if (!process.env.RESEND_API_KEY) return { ok: false };
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text
    });
    return { ok: true };
  } catch (err) {
    console.error('club mail failed:', err instanceof Error ? err.message : err);
    return { ok: false };
  }
}
