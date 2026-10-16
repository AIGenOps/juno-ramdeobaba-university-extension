# JUNO Assistant (RBU / RCOEM)

I built this Chrome extension to make using the JUNO student portal at Ramdeobaba University (RBU / RCOEM) easier and faster.

It handles two main things:

### 1. Auto-Fills Feedback
Filling feedback on JUNO takes forever because you have to click through 10+ teachers and departments one by one.
- You can choose what rating to give (Excellent, Good, or a realistic mix of 4s and 5s).
- Click **Auto-Fill & Complete All** and it automatically fills the ratings, enters comments, clicks "Save and Next", and finishes the whole thing for you.
- You can also fill one page at a time if you want to review each form yourself.

### 2. Attendance & Bunk Calculator
When you open your attendance page, a side panel shows:
- How many classes you can safely bunk per subject while keeping your attendance at or above 75%.
- If your attendance is below 75%, it tells you exactly how many consecutive classes you need to attend to reach 75%.
- Your overall attendance percentage and total classes attended.

---

## How to Install

1. Download or clone this repository:
   ```bash
   git clone https://github.com/AIGenOps/juno-ramdeobaba-university-extension.git
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select this folder.
5. Open JUNO, and the helper will appear automatically on the feedback and attendance pages.
