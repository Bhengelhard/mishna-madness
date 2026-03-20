import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'Mishna Madness <onboarding@resend.dev>';

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mishna Madness</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#2d6a4f;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.5px;">Mishna Madness</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f0f0f0;padding:20px 32px;text-align:center;border-top:1px solid #e0e0e0;">
              <p style="margin:0;color:#888888;font-size:13px;">Mishna Madness -- Torah Learning Tournament</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background-color:#2d6a4f;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:6px;min-height:44px;line-height:1.5;margin-top:24px;">${label}</a>`;
}

function greeting(name: string): string {
  return `<p style="margin:0 0 16px;color:#222222;font-size:16px;">Hi ${name},</p>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;color:#444444;font-size:15px;line-height:1.6;">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e8e8e8;margin:24px 0;" />`;
}

// 1. Round Start Email
export async function sendRoundStartEmail(params: {
  to: string;
  participantName: string;
  opponentName: string;
  roundNumber: number;
  specialMasechta: string;
  specialSeder: string | null;
  deadline: string;
  submitLink: string;
}): Promise<void> {
  const { to, participantName, opponentName, roundNumber, specialMasechta, specialSeder, deadline, submitLink } = params;

  const content = `
    ${greeting(participantName)}
    ${paragraph(`Round ${roundNumber} of Mishna Madness is officially underway! You are matched up against <strong>${opponentName}</strong> this round. May the learning begin!`)}
    ${divider()}
    <p style="margin:0 0 8px;color:#222222;font-size:15px;font-weight:700;">This Round's Special Chapters</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="padding:10px 16px;background-color:#e8f5e9;border-radius:6px;margin-bottom:8px;">
          <span style="font-size:14px;color:#2d6a4f;font-weight:700;">3x Points:</span>
          <span style="font-size:15px;color:#222222;margin-left:8px;">${specialMasechta}</span>
        </td>
      </tr>
      ${specialSeder ? `<tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:10px 16px;background-color:#e8f5e9;border-radius:6px;">
          <span style="font-size:14px;color:#2d6a4f;font-weight:700;">2x Points:</span>
          <span style="font-size:15px;color:#222222;margin-left:8px;">${specialSeder} (entire Seder)</span>
        </td>
      </tr>` : ''}
    </table>
    ${divider()}
    ${paragraph(`Submit your Mishnayos before the deadline: <strong>${deadline}</strong>`)}
    <div style="text-align:center;">
      ${ctaButton('Submit My Mishnayos', submitLink)}
    </div>
    <p style="margin:24px 0 0;color:#888888;font-size:13px;text-align:center;">Good luck and happy learning!</p>
  `;

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Mishna Madness Round ${roundNumber} is Live!`,
      html: baseTemplate(content),
    });
  } catch (err) {
    console.error('[notifications] sendRoundStartEmail error:', err);
  }
}

// 2. Reminder Email
export async function sendReminderEmail(params: {
  to: string;
  participantName: string;
  roundNumber: number;
  submitLink: string;
  type: '5pm' | '9pm' | '8am';
}): Promise<void> {
  const { to, participantName, roundNumber, submitLink, type } = params;

  const subjectMap: Record<'5pm' | '9pm' | '8am', string> = {
    '5pm': 'Reminder: Mishna Madness scores due tomorrow',
    '9pm': '3 hours left -- submit your Mishnayos!',
    '8am': 'Last chance -- late submissions close at noon',
  };

  const bodyMap: Record<'5pm' | '9pm' | '8am', string> = {
    '5pm': `The deadline for Round ${roundNumber} is coming up tomorrow. If you haven't submitted your Mishnayos yet, now is a great time to log in and record your learning before the window closes.`,
    '9pm': `You have just 3 hours left to submit your Mishnayos for Round ${roundNumber}. Don't let your hard work go unrecorded -- head over now and log your learning!`,
    '8am': `This is your final reminder for Round ${roundNumber}. Late submissions are still accepted until noon today. After that, the round will be locked. Log in now to make sure your score is counted.`,
  };

  const content = `
    ${greeting(participantName)}
    ${paragraph(bodyMap[type])}
    <div style="text-align:center;">
      ${ctaButton('Submit Now', submitLink)}
    </div>
    <p style="margin:24px 0 0;color:#888888;font-size:13px;text-align:center;">You've got this!</p>
  `;

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: subjectMap[type],
      html: baseTemplate(content),
    });
  } catch (err) {
    console.error('[notifications] sendReminderEmail error:', err);
  }
}

// 3. Round Results Email
export async function sendRoundResultsEmail(params: {
  to: string;
  participantName: string;
  roundNumber: number;
  won: boolean;
  score: number;
  opponentScore: number;
  opponentName: string;
  bracketLink: string;
  nextRoundDate?: string;
}): Promise<void> {
  const { to, participantName, roundNumber, won, score, opponentScore, opponentName, bracketLink, nextRoundDate } = params;

  const resultLine = won
    ? `<p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#2d6a4f;text-align:center;">You won!</p>`
    : `<p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#b04040;text-align:center;">Better luck next time.</p>`;

  const resultMessage = won
    ? `Congratulations! You defeated <strong>${opponentName}</strong> in Round ${roundNumber}. Your dedication to learning paid off.`
    : `Round ${roundNumber} is over. You were narrowly beaten by <strong>${opponentName}</strong> this time around. Keep up the great learning!`;

  const nextRoundNote = won && nextRoundDate
    ? paragraph(`Your next round begins on <strong>${nextRoundDate}</strong>. Keep the momentum going!`)
    : '';

  const content = `
    ${greeting(participantName)}
    ${resultLine}
    ${paragraph(`Round ${roundNumber} results are in!`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;text-align:center;">
      <tr>
        <td style="width:50%;padding:16px;background-color:#f9f9f9;border-radius:6px 0 0 6px;border:1px solid #e8e8e8;">
          <p style="margin:0 0 4px;font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:0.5px;">You</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:#2d6a4f;">${score}</p>
        </td>
        <td style="width:50%;padding:16px;background-color:#f9f9f9;border-radius:0 6px 6px 0;border:1px solid #e8e8e8;border-left:none;">
          <p style="margin:0 0 4px;font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:0.5px;">${opponentName}</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:#444444;">${opponentScore}</p>
        </td>
      </tr>
    </table>
    ${divider()}
    ${paragraph(resultMessage)}
    ${nextRoundNote}
    <div style="text-align:center;">
      ${ctaButton('View Bracket', bracketLink)}
    </div>
  `;

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Mishna Madness Round ${roundNumber} Results`,
      html: baseTemplate(content),
    });
  } catch (err) {
    console.error('[notifications] sendRoundResultsEmail error:', err);
  }
}

// 4. Bracket Update Email
export async function sendBracketUpdateEmail(params: {
  to: string;
  participantName: string;
  bracketLink: string;
  message: string;
}): Promise<void> {
  const { to, participantName, bracketLink, message } = params;

  const content = `
    ${greeting(participantName)}
    ${paragraph(message)}
    <div style="text-align:center;">
      ${ctaButton('View Bracket', bracketLink)}
    </div>
  `;

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Mishna Madness Bracket Update',
      html: baseTemplate(content),
    });
  } catch (err) {
    console.error('[notifications] sendBracketUpdateEmail error:', err);
  }
}
