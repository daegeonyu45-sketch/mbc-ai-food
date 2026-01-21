
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_MODELS } from "../constants";
import { FoodItem, QuizResult, Difficulty } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateFoodItem = async (category: string, difficulty: Difficulty, excludeList: string[] = []): Promise<FoodItem> => {
  const ai = getAI();
  
  // 무작위성을 높이기 위한 스타일 키워드
  const flavors = ["매콤한", "달콤한", "고소한", "담백한", "이색적인", "전통적인", "바삭한", "부드러운", "풍미 가득한"];
  const randomFlavor = flavors[Math.floor(Math.random() * flavors.length)];
  
  const excludePrompt = excludeList.length > 0 
    ? `IMPORTANT: ABSOLUTELY DO NOT pick any of these foods: ${excludeList.join(", ")}.` 
    : "";

  let difficultyInstruction = "";
  switch (difficulty) {
    case Difficulty.EASY:
      difficultyInstruction = "누구나 이름만 들으면 아는 전 세계적인 대중 음식을 선택하세요. 힌트는 아주 직접적이고 쉬워야 합니다.";
      break;
    case Difficulty.MEDIUM:
      difficultyInstruction = "어느 정도 대중적이지만 해당 국가의 특색이 살아있는 음식을 선택하세요. 힌트는 적당히 유추가 가능해야 합니다.";
      break;
    case Difficulty.HARD:
      difficultyInstruction = "미식가가 아니면 알기 힘든 희귀하거나 아주 구체적인 지역 음식을 선택하세요. 힌트는 매우 까다롭고 창의적이어야 합니다.";
      break;
  }

  const response = await ai.models.generateContent({
    model: DEFAULT_MODELS.TEXT,
    contents: `당신은 세계 최고의 미식 큐레이터입니다. ${category} 카테고리에서 ${randomFlavor} 특징을 가진 음식을 하나 선정해주세요.
    난이도: ${difficulty}.
    지침: ${difficultyInstruction}
    ${excludePrompt}
    
    응답은 반드시 다음 JSON 형식을 따르세요:
    {
      "name": "음식 이름 (한국어)",
      "description": "그 음식의 맛과 특징을 설명하는 맛깔나는 문장 (한국어)",
      "hint": "이름을 직접 언급하지 않는 결정적인 힌트 (한국어)"
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          hint: { type: Type.STRING }
        },
        required: ["name", "description", "hint"]
      }
    }
  });

  const foodData = JSON.parse(response.text) as FoodItem;

  // 이미지 생성 시 시각적 다양성을 위한 무작위 요소
  const styles = ["high-end restaurant plating", "street food style", "home-cooked meal vibe", "food magazine editorial shot"];
  const lightings = ["natural sunlight", "warm candle light", "bright studio lighting", "moody dim lighting"];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  const randomLighting = lightings[Math.floor(Math.random() * lightings.length)];

  const imageResponse = await ai.models.generateContent({
    model: DEFAULT_MODELS.IMAGE,
    contents: {
      parts: [{ text: `A stunning, high-quality professional food photograph of ${foodData.name}. ${randomStyle}, ${randomLighting}. Macro shot, appetizing texture, vibrant colors, shallow depth of field. 8k resolution.` }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  let imageUrl = "";
  for (const part of imageResponse.candidates[0].content.parts) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  return { ...foodData, imageUrl };
};

export const verifyAnswer = async (targetFood: string, userAnswer: string): Promise<QuizResult> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODELS.TEXT,
    contents: `정답: "${targetFood}", 사용자 입력: "${userAnswer}". 
    사용자가 입력한 단어가 정답과 의미상 일치하거나 아주 유사한지 판단하세요. (한국어 맞춤법 소폭 무시 가능)
    {
      "isCorrect": true/false,
      "feedback": "짧고 친절한 피드백 (한국어)"
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING }
        },
        required: ["isCorrect", "feedback"]
      }
    }
  });

  return JSON.parse(response.text) as QuizResult;
};
