export interface EmailPayload {
  subject: string;
  textBody: string;
  htmlBody: string;
}

/**
 * Standardizes professional agricultural project milestones and reminders templates.
 */
export function generateMilestoneEmail(params: {
  customerName: string;
  projectName: string;
  currentStage: string;
  progressPercent: number;
  location: string;
  engineerName?: string;
}): EmailPayload {
  const { customerName, projectName, currentStage, progressPercent, location, engineerName = 'Sarah Jenkins' } = params;

  const subject = `Project Update: ${projectName}, ${location}`;

  const textBody = `Dear Mr./Ms. ${customerName},

We are pleased to share a key milestone update regarding your ${projectName} project in ${location}.

Under the expert supervision of our Project Engineer, ${engineerName}, we have successfully completed all current stage milestones and transitioned your project to the *${currentStage}* phase.

==================================================
PROJECT PROGRESS SNAPSHOT
==================================================
• Project Name: ${projectName}
• Target Site Location: ${location}
• Current Stage: ${currentStage}
• Overall Completion: ${progressPercent}%
• Supervising Engineer: ${engineerName}
==================================================

With this crucial progress successfully in place, our team is excited to begin the next phase of construction. We are fully committed to maintaining this excellent momentum to deliver your premier-quality agricultural structure.

Thank you for partnering with HydroGreen Energy Pvt Ltd. We will continue to keep you updated as we progress.

Warm regards,

HydroGreen Energy Pvt Ltd
Premier Agricultural Solutions
Web: www.hydrogreen.in`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; }
    .logo { color: #059669; font-size: 24px; font-weight: bold; text-decoration: none; }
    .title { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 10px; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .card-title { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; }
    .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #64748b; }
    .company { font-weight: bold; color: #059669; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">HydroGreen Energy</div>
    <div class="title">Project Milestone & Construction Status Update</div>
  </div>

  <p>Dear Mr./Ms. <strong>${customerName}</strong>,</p>

  <p>We are pleased to share a key milestone update regarding your <strong>${projectName}</strong> project in <strong>${location}</strong>.</p>

  <p>Under the expert supervision of our Project Engineer, <strong>${engineerName}</strong>, we have successfully completed the previous stage and transitioned your project to the <strong>${currentStage}</strong> phase.</p>

  <div class="card">
    <div class="card-title">PROJECT PROGRESS SNAPSHOT</div>
    <div style="font-size: 14px; font-weight: bold; color: #10b981; margin-bottom: 12px;">Overall Completion: ${progressPercent}%</div>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Project Name:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600; text-align: right;">${projectName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Target Site Location:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600; text-align: right;">${location}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Current Active Stage:</td>
        <td style="padding: 4px 0; color: #10b981; font-weight: 600; text-align: right;">${currentStage}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Project Engineer:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600; text-align: right;">${engineerName}</td>
      </tr>
    </table>
  </div>

  <p>With this crucial foundation successfully in place, our team is excited to begin the next phase of construction. We are fully committed to maintaining this excellent momentum to deliver your premier-quality agricultural structure.</p>

  <p>Thank you for partnering with HydroGreen Energy Pvt Ltd. We will continue to keep you updated as we progress.</p>

  <div class="footer">
    <p>Warm regards,</p>
    <p class="company">HydroGreen Energy Pvt Ltd</p>
    <p style="font-style: italic; margin-top: -8px;">Premier Agricultural Solutions</p>
  </div>
</body>
</html>`;

  return { subject, textBody, htmlBody };
}

/**
 * Generates a beautiful professional Reminder email.
 */
export function generateReminderEmail(params: {
  customerName: string;
  projectName: string;
  pendingStage: string;
  location: string;
  actionRequired: string;
}): EmailPayload {
  const { customerName, projectName, pendingStage, location, actionRequired } = params;

  const subject = `Action Required: Progress Reminder - ${projectName}`;

  const textBody = `Dear Mr./Ms. ${customerName},

This is a professional reminder from the engineering division at HydroGreen Energy Pvt Ltd. 

We are currently tracking progress on your ${projectName} project in ${location}. In order to transition smoothly into the "${pendingStage}" stage without structural delays, there is a pending action item requiring your attention:

==================================================
PENDING ACTION & OVERVIEW
==================================================
• Project Name: ${projectName}
• Proposed Location: ${location}
• Current Milestone Block: ${pendingStage}
• Required Client Input: ${actionRequired}
==================================================

Please coordinate with your designated HydroGreen field engineer or respond to this email at your earliest convenience to resolve this checkpoint.

Thank you for your cooperation and for partnering with HydroGreen Energy to ensure a seamless project implementation lifecycle.

Warm regards,

HydroGreen Energy Pvt Ltd
Premier Agricultural Solutions
Web: www.hydrogreen.in`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px; }
    .logo { color: #dc2626; font-size: 24px; font-weight: bold; text-decoration: none; }
    .title { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 10px; }
    .card { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .card-title { font-size: 11px; font-weight: bold; color: #991b1b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
    .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #64748b; }
    .company { font-weight: bold; color: #dc2626; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">HydroGreen Energy</div>
    <div class="title">Action Required: Construction Phase Checkpoint Reminder</div>
  </div>

  <p>Dear Mr./Ms. <strong>${customerName}</strong>,</p>

  <p>This is a professional checkpoint reminder from the engineering division at HydroGreen Energy Pvt Ltd.</p>

  <p>We are currently tracking progress on your <strong>${projectName}</strong> project in <strong>${location}</strong>. In order to transition smoothly into the <strong>${pendingStage}</strong> stage without structural delays, there is an outstanding action item requiring your attention:</p>

  <div class="card">
    <div class="card-title">PENDING ACTION & DETAILS</div>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 4px 0; color: #991b1b; font-weight: 500;">Project Name:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600; text-align: right;">${projectName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #991b1b; font-weight: 500;">Proposed Location:</td>
        <td style="padding: 4px 0; color: #0f172a; font-weight: 600; text-align: right;">${location}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #991b1b; font-weight: 500;">Milestone Checkpoint:</td>
        <td style="padding: 4px 0; color: #dc2626; font-weight: 600; text-align: right;">${pendingStage}</td>
      </tr>
      <tr style="border-top: 1px dashed #fecaca;">
        <td style="padding: 8px 0 4px 0; color: #991b1b; font-weight: bold;">Required Action:</td>
        <td style="padding: 8px 0 4px 0; color: #7f1d1d; font-weight: bold; text-align: right;">${actionRequired}</td>
      </tr>
    </table>
  </div>

  <p>Please coordinate with your designated HydroGreen field engineer or respond directly to this notice at your earliest convenience to resolve this checkpoint.</p>

  <p>Thank you for your active cooperation and for partnering with HydroGreen Energy to ensure a seamless, high-yield project execution.</p>

  <div class="footer">
    <p>Warm regards,</p>
    <p class="company">HydroGreen Energy Pvt Ltd</p>
    <p style="font-style: italic; margin-top: -8px;">Premier Agricultural Solutions</p>
  </div>
</body>
</html>`;

  return { subject, textBody, htmlBody };
}
