# RoadReady Feedback Insights

Build a web application called “RoadReady Insights”, the second phase of a RoadReady Traffic Services platform.

1. Create a citizen feedback page where users can select a traffic service (Licence Booking, Vehicle Registration, Traffic Fines, Applications) and submit a rating and written feedback.

2. Add sentiment analysis using VADER and a Hugging Face pre-trained sentiment model. Classify feedback as Positive, Neutral, or Negative and store the sentiment score/confidence.

3. Use Supabase/PostgreSQL to securely store users, feedback, service types, sentiment results and timestamps.

4. Create an administrator dashboard showing total feedback, positive/neutral/negative percentages, sentiment by service, trends over time, and common issues using charts.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/60745056-45a6-4f70-a6b6-a4b21e102aba).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
