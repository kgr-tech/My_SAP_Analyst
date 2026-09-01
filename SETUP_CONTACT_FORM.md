# Contact Form Setup Instructions

Your contact form is configured to send messages to: **giresh19reddy@gmail.com**

## Setup Steps (Free - 5 minutes)

### 1. Create Formspree Account
- Go to https://formspree.io/
- Click "Sign Up" (FREE plan available)
- Sign up with your email (can use giresh19reddy@gmail.com)

### 2. Create a New Form
- After logging in, click "New Form"
- Enter form name: "Portfolio Contact Form"
- Enter your email: **giresh19reddy@gmail.com**
- Copy the Form ID (looks like: `xanykyqo`)

### 3. Update the Code
- Open `script.js`
- Find this line:
  ```javascript
  const response = await fetch("https://formspree.io/f/xanykyqo", {
  ```
- Replace `xanykyqo` with YOUR actual Form ID from Formspree

### 4. Test It
- Visit your website
- Fill out the contact form
- Submit it
- Check your Gmail inbox - you should receive the message!

## Alternative: Use EmailJS (Also Free)
If you prefer EmailJS:
1. Go to https://www.emailjs.com/
2. Sign up and create an email service
3. Get your service ID, template ID, and public key
4. Update script.js accordingly

## Current Status
- ✅ Form HTML is ready
- ✅ JavaScript handler is implemented
- ⏳ Needs Formspree setup (just get your Form ID)
- ⏳ Update the Form ID in script.js

## What Happens When Someone Submits?
1. User fills out: Name, Email, Subject, Message
2. Form data is sent to Formspree
3. Formspree forwards it to: giresh19reddy@gmail.com
4. You receive an email notification
5. User sees success message on the website

---
**Need help?** The code is ready to go - just need the Formspree Form ID!
