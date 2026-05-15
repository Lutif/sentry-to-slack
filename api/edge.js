export const config = {
  runtime: 'edge',
}

const sendMessage = async (channel, {level, formatted, environment, email, title, culprit, project, permalink}) => {
  const isError = level === "error";
  const titleText = permalink ? `<${permalink}|${title}>` : title;

  const blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `${isError ? ":red_circle:" : ""} *${titleText}*`
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": `*Environment:*\n${environment}` },
        { "type": "mrkdwn", "text": `*Level:*\n${level}` },
        { "type": "mrkdwn", "text": `*Project:*\n${project}` }
      ]
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": `*User:*\n${email}` }
      ]
    },
    { "type": "divider" },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": `*Message:*\n${formatted}` }
    },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": `*Culprit:*\n\`${culprit}\`` }
    },
    { "type": "divider" },
  ];

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${process.env.SLACK_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ channel, blocks }),
    });

    // Native fetch requires .json() to parse the response
    const data = await response.json(); 
    
    // Slack returns { "ok": false, "error": "..." } if something goes wrong
    if (!data.ok) {
      console.error("Slack API Error:", data.error);
    } else {
      console.log("Successfully sent to Slack!");
    }
    
    return data;
  } catch(e) {
    console.error("Network/Fetch error:", e);
  }
}

export default async (req) => {
  // 1. Prevent crashes from GET requests (like loading it in a browser)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed. Send a POST request.', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
    console.log("RAW SENTRY PAYLOAD:", JSON.stringify(body, null, 2));
  } catch (err) {
    console.error("Failed to parse JSON body:", err);
    return new Response('Bad Request: Invalid JSON', { status: 400 });
  }

  const payloadData = body?.data || {};
  // Sentry integration webhooks send the issue at data.issue; event-alert webhooks send data.event
  const source = payloadData.issue || payloadData.event || payloadData;

  const projectField = source?.project;
  const project =
    (projectField && (projectField.slug || projectField.name)) ||
    payloadData?.project_name ||
    payloadData?.project ||
    'Unknown Project';

  const culprit = source?.culprit || 'Unknown Culprit';
  const level = source?.level || 'info';
  const formatted =
    source?.metadata?.value ||
    source?.logentry?.formatted ||
    source?.message ||
    source?.title ||
    'No message provided';
  const email = source?.user?.email || source?.assignedTo?.email || 'Unknown User';
  const environment = source?.environment || 'production';
  const title = source?.metadata?.title || source?.title || 'Sentry Alert';
  const permalink = source?.permalink || source?.web_url || null;

  await sendMessage(process.env.CHANNEL_ID, {level, formatted, environment, email, title, culprit, project, permalink});

  return new Response(`Webhook Processed Successfully`, { status: 200 });
}