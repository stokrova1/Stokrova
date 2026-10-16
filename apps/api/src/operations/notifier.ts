/**
 * Sends the owner's daily summary. Email via Resend (RESEND_API_KEY + ALERTS_FROM_EMAIL),
 * WhatsApp via Meta's WhatsApp Cloud API (WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID).
 * A channel without its keys is simply reported as "not set up" — nothing is faked.
 */
type Env = Record<string, string | undefined>;
type Result = { ok: boolean; detail: string };

export function configuredChannels(env: Env = process.env) {
  return {
    email: Boolean(env['RESEND_API_KEY'] && env['ALERTS_FROM_EMAIL']),
    whatsapp: Boolean(env['WHATSAPP_TOKEN'] && env['WHATSAPP_PHONE_NUMBER_ID']),
  };
}

export async function sendEmail(to: string, subject: string, text: string, env: Env = process.env, f: typeof fetch = fetch): Promise<Result> {
  if (!configuredChannels(env).email) return { ok: false, detail: 'Email sending is not set up on the server yet.' };
  try {
    const res = await f('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env['RESEND_API_KEY']}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env['ALERTS_FROM_EMAIL'], to: [to], subject, text }),
    });
    return res.ok ? { ok: true, detail: 'Sent' } : { ok: false, detail: `Email service refused (${res.status}).` };
  } catch (e) { return { ok: false, detail: `Email service unreachable: ${(e as Error).message}` }; }
}

export async function sendWhatsApp(to: string, text: string, env: Env = process.env, f: typeof fetch = fetch): Promise<Result> {
  if (!configuredChannels(env).whatsapp) return { ok: false, detail: 'WhatsApp sending is not set up on the server yet.' };
  try {
    const res = await f(`https://graph.facebook.com/v20.0/${env['WHATSAPP_PHONE_NUMBER_ID']}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env['WHATSAPP_TOKEN']}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/^\+/, ''), type: 'text', text: { body: text.slice(0, 4000) } }),
    });
    return res.ok ? { ok: true, detail: 'Sent' } : { ok: false, detail: `WhatsApp refused (${res.status}).` };
  } catch (e) { return { ok: false, detail: `WhatsApp unreachable: ${(e as Error).message}` }; }
}
