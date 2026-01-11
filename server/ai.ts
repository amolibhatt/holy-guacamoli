import OpenAI from "openai";

// Using Groq API which is OpenAI-compatible
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

interface QuestionAnswer {
  question: string;
  userAAnswer: string;
  userBAnswer: string;
}

interface CategoryQuestionAnswer extends QuestionAnswer {
  category: string;
}

interface CategoryInsight {
  category: string;
  compatibilityScore: number;
  insight: string;
}

export async function generateCategoryInsights(questionsAndAnswers: CategoryQuestionAnswer[]): Promise<CategoryInsight[]> {
  const prompt = `You are a relationship analyst. Analyze these couples' answers and rate their compatibility for each category on a scale of 1-100.

Questions and Answers by Category:
${questionsAndAnswers.map((qa) => `
Category: ${qa.category}
Question: ${qa.question}
Partner A: ${qa.userAAnswer}
Partner B: ${qa.userBAnswer}
`).join('\n')}

For each category, provide:
1. A compatibility score (1-100) based on how aligned/complementary their answers are
2. A brief insight (1 sentence) about their dynamic in this area

Respond in JSON format:
{
  "insights": [
    {"category": "deep_end", "compatibilityScore": 85, "insight": "You both value emotional depth and aren't afraid to be vulnerable."},
    {"category": "danger_zone", "compatibilityScore": 70, "insight": "Your playful debates show healthy disagreement."}
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);
    return parsed.insights || [];
  } catch (error) {
    console.error("Error generating category insights:", error);
    // Generate deterministic fallback insights based on answer similarity
    return questionsAndAnswers.map(qa => {
      const answerA = qa.userAAnswer.toLowerCase().trim();
      const answerB = qa.userBAnswer.toLowerCase().trim();
      
      // Handle empty answers - low score if either is missing
      if (!answerA || !answerB) {
        return {
          category: qa.category,
          compatibilityScore: 30,
          insight: "One or both answers are missing - keep communicating!"
        };
      }
      
      // Simple similarity check
      let score = 50; // base score
      if (answerA === answerB) {
        score = 95;
      } else if (answerA.length >= 3 && answerB.length >= 3 && 
                 (answerA.includes(answerB) || answerB.includes(answerA))) {
        score = 80;
      } else {
        // Check for common words
        const wordsA = answerA.split(/\s+/).filter(w => w.length > 3);
        const wordsB = answerB.split(/\s+/).filter(w => w.length > 3);
        const common = wordsA.filter(w => wordsB.includes(w)).length;
        score = Math.min(75, 50 + common * 10);
      }
      
      return {
        category: qa.category,
        compatibilityScore: score,
        insight: "Keep exploring this area together!"
      };
    });
  }
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
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
    });

    return response.choices[0].message.content || "Take 5 minutes to share one thing you appreciated about your partner today.";
  } catch (error) {
    console.error("Error generating follow-up task:", error);
    return "Take 5 minutes to share one thing you appreciated about your partner today.";
  }
}
