import os
import json
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_wrong_options(question, correct_answer):
    prompt = f"""
    Generate exactly 3 plausible but incorrect multiple choice options.

    Question: {question}
    Correct Answer: {correct_answer}

    IMPORTANT:
    - Do NOT repeat the correct answer.
    - Return ONLY a valid JSON array.
    - No explanation.
    - No markdown.
    - Example:
      ["Option A", "Option B", "Option C"]
    """

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt,
    )

    try:
        text = response.text

        if not text:
            raise ValueError("Empty AI response")

        text = text.strip()

        # Remove markdown blocks if present
        if "```" in text:
            text = text.split("```")[1].strip()

        # Try extracting JSON array if extra text exists
        start = text.find("[")
        end = text.rfind("]") + 1

        if start == -1 or end == -1:
            raise ValueError("JSON array not found in AI response")

        json_text = text[start:end]

        options = json.loads(json_text)

        if not isinstance(options, list) or len(options) != 3:
            raise ValueError("Invalid AI format")

        return options

    except Exception as e:
        raise Exception(f"AI response parsing failed: {str(e)}")
    
    

def generate_full_exam(subject, topic, difficulty, count):
    prompt = f"""
    Generate {count} multiple choice questions.

    Subject: {subject}
    Topic: {topic}
    Difficulty: {difficulty}

    Requirements:
    - Each question must have:
      question_text
      correct_answer
      wrong_options (exactly 3)
      Ensure all questions are unique.
      Avoid repeating concepts.
      Keep options conceptually similar.
      Do not include explanations.
      
    Return STRICT JSON array format:

    [
        {{
            "question_text": "...",
            "correct_answer": "...",
            "wrong_options": ["...", "...", "..."]
        }}
    ]
    """

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt,
    )

    try:
        text = response.text.strip()

        if "```" in text:
            text = text.split("```")[1].strip()

        start = text.find("[")
        end = text.rfind("]") + 1

        if start == -1 or end == -1:
            raise ValueError("JSON array not found")

        json_text = text[start:end]

        questions = json.loads(json_text)

        if not isinstance(questions, list):
            raise ValueError("Invalid AI format")

        return questions

    except Exception as e:
        raise Exception(f"AI full exam parsing failed: {str(e)}")





