const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// In-memory storage (MVP)
const users = {
  "LL12345": {
    user_id: "LL12345",
    name: "Mukul",
    phone: "whatsapp:+91XXXXXXXXXX",
    role: "shipper"
  }
};

const sessions = {};
const otps = {};

// Helper: generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Main Webhook
app.post("/whatsapp", (req, res) => {
  const msg = (req.body.Body || "").trim();
  const phone = req.body.From;

  if (!sessions[phone]) {
    sessions[phone] = { step: "start" };
  }

  let session = sessions[phone];
  let reply = "";

  // 🔹 STEP 1: Start
  if (msg.toLowerCase() === "hi") {
    session.step = "choose_user";
    reply = "👋 Welcome to LoadLink\n\n1️⃣ New User\n2️⃣ Existing User";
  }

  // 🔹 STEP 2: Choose New / Existing
  else if (session.step === "choose_user") {
    if (msg === "1") {
      reply = "🌐 Register here:\nhttps://your-website-link.com";
    } 
    else if (msg === "2") {
      session.step = "enter_code";
      reply = "Enter your Login Code:";
    } 
    else {
      reply = "Invalid option. Type 1 or 2";
    }
  }

  // 🔹 STEP 3: Enter Code
  else if (session.step === "enter_code") {
    const user = users[msg];

    if (!user) {
      reply = "❌ Invalid Code. Try again:";
    } else {
      session.user = user;

      const otp = generateOTP();
      otps[phone] = otp;

      console.log(`OTP for ${phone}: ${otp}`);

      session.step = "verify_otp";
      reply = "📲 OTP sent to your registered number\nEnter OTP:";
    }
  }

  // 🔹 STEP 4: Verify OTP
  else if (session.step === "verify_otp") {
    if (msg === otps[phone]) {
      session.step = "menu";

      if (session.user.role === "shipper") {
        reply = `✅ Login Successful!\n\n🚚 Menu:\n1️⃣ Post Load\n2️⃣ My Loads\n3️⃣ Profile`;
      } else if (session.user.role === "transporter") {
        reply = `✅ Login Successful!\n\n🚛 Menu:\n1️⃣ Find Load\n2️⃣ My Trips`;
      } else {
        reply = `✅ Login Successful!\n\n🧍 Menu:\n1️⃣ Find Trip`;
      }
    } else {
      reply = "❌ Wrong OTP. Try again:";
    }
  }

  // 🔹 STEP 5: MENU
  else if (session.step === "menu") {
    if (msg === "1" && session.user.role === "shipper") {
      session.step = "pickup";
      reply = "Enter Pickup City:";
    } else {
      reply = "Invalid option";
    }
  }

  // 🔹 STEP 6: POST LOAD FLOW
  else if (session.step === "pickup") {
    session.pickup = msg;
    session.step = "drop";
    reply = "Enter Drop City:";
  }

  else if (session.step === "drop") {
    session.drop = msg;
    session.step = "material";
    reply = "Enter Material:";
  }

  else if (session.step === "material") {
    session.material = msg;
    session.step = "weight";
    reply = "Enter Weight:";
  }

  else if (session.step === "weight") {
    session.weight = msg;
    session.step = "confirm";

    reply = `Confirm Load:\n${session.pickup} → ${session.drop}\n${session.material}\n${session.weight}\n\n1️⃣ Confirm\n2️⃣ Cancel`;
  }

  else if (session.step === "confirm") {
    if (msg === "1") {
      session.step = "menu";
      reply = "✅ Load Posted Successfully!";
    } else {
      session.step = "menu";
      reply = "❌ Cancelled";
    }
  }

  else {
    reply = "Type 'hi' to start";
  }

  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${reply}</Message></Response>`);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
