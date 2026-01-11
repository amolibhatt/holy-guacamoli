import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface QuestionAnswer {
  question: string;
  userAAnswer: string;
  userBAnswer: string;
}

export async function generateFollowupTask(questionsAndAnswers: QuestionAnswer[]): Promise<string> {
  const prompt = `You are a warm, thoughtful relationship coach. Based on these couples' answers to daily questions, create ONE specific, actionable follow-up activity they can do together today to deepen their connection.

Questions and Answers:
${questionsAndAnswers.map((qa, i) => `
Q${i + 1}: ${qa.question}
Partner A: ${qa.userAAnswer}
Partner B: ${qa.userBAnswer}
`).join('\n')}

Create a brief, specific activity (1-2 sentences) that:
- References something from their answers
- Is doable today (takes 5-30 minutes)
- Encourages real conversation or shared experience
- Feels personal, not generic

Examples of good tasks:
- "Share one childhood memory about the food you both mentioned loving."
- "Take 10 minutes tonight to plan that trip you both dreamed about."
- "Text each other a song that reminds you of your first date."

Respond with ONLY the task text, nothing else.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 150,
    });

    return response.choices[0].message.content || "Take 5 minutes to share one thing you appreciated about your partner today.";
  } catch (error) {
    console.error("Error generating follow-up task:", error);
    return "Take 5 minutes to share one thing you appreciated about your partner today.";
  }
}
