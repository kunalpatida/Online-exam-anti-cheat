import os
import json
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-2.5-flash"


def clean_json_text(text):
    text = text.strip()
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("[") or part.startswith("{"):
                text = part
                break
    start_bracket = text.find("[")
    end_bracket = text.rfind("]")
    if start_bracket != -1 and end_bracket != -1:
        return text[start_bracket:end_bracket + 1]
    return text


def call_gemini(prompt, retries=3, delay=2):
    for attempt in range(retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
            )
            text = response.text
            if text and text.strip():
                return text.strip()
            print(f"Empty response on attempt {attempt + 1}, retrying...")
        except Exception as e:
            print(f"Gemini API error on attempt {attempt + 1}: {str(e)}")
        if attempt < retries - 1:
            time.sleep(delay)
    raise Exception("Gemini API failed after multiple retries")


def generate_wrong_options(question, correct_answer):
    prompt = f"""Generate exactly 3 plausible but incorrect multiple choice options.

Question: {question}
Correct Answer: {correct_answer}

Rules:
- Do NOT include the correct answer
- Return ONLY a valid JSON array with exactly 3 strings
- No markdown, no explanation
- Example: ["Option 1", "Option 2", "Option 3"]"""

    for attempt in range(3):
        try:
            text = call_gemini(prompt)
            text = clean_json_text(text)
            options = json.loads(text)

            if not isinstance(options, list):
                raise ValueError("Not a list")

            options = [str(o).strip() for o in options if str(o).strip()]
            options = [o for o in options if o.lower() != correct_answer.lower()]

            if len(options) >= 3:
                return options[:3]

            raise ValueError(f"Not enough options: {len(options)}")

        except Exception as e:
            print(f"generate_wrong_options attempt {attempt + 1} failed: {str(e)}")
            if attempt < 2:
                time.sleep(1)

    raise Exception("Failed to generate wrong options after 3 attempts")


def generate_full_exam(subject, topic, difficulty, count):
    prompt = f"""Generate exactly {count} multiple choice questions.

Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}

Return ONLY a JSON array. No markdown. No explanation.
Format:
[
  {{
    "question_text": "Question here?",
    "options": ["A: option1", "B: option2", "C: option3", "D: option4"],
    "correct": "A"
  }}
]"""

    for attempt in range(3):
        try:
            text = call_gemini(prompt)
            text = clean_json_text(text)
            questions = json.loads(text)

            if not isinstance(questions, list) or len(questions) == 0:
                raise ValueError("Empty or invalid question list")

            valid = []
            for q in questions:
                if (
                    isinstance(q, dict)
                    and q.get("question_text", "").strip()
                    and isinstance(q.get("options"), list)
                    and len(q.get("options", [])) >= 4
                    and q.get("correct", "").strip()
                ):
                    valid.append(q)

            if len(valid) == 0:
                raise ValueError("No valid questions in response")

            return valid

        except Exception as e:
            print(f"generate_full_exam attempt {attempt + 1} failed: {str(e)}")
            if attempt < 2:
                time.sleep(2)

    raise Exception("Failed to generate full exam after 3 attempts")


def generate_full_question(topic):
    prompt = f"""Generate ONE multiple choice question on topic: {topic}

Use EXACTLY this format:
Question: <question text>
A: <option A>
B: <option B>
C: <option C>
D: <option D>
Correct: <A or B or C or D>"""

    for attempt in range(3):
        try:
            text = call_gemini(prompt)
            print(f"\nAI RAW RESPONSE (attempt {attempt + 1}):\n", text)

            lines = [l.strip() for l in text.strip().split("\n") if l.strip()]

            question = ""
            options = []
            correct = "A"

            for line in lines:
                if line.startswith("Question:"):
                    question = line.replace("Question:", "").strip()
                elif line.startswith(("A:", "B:", "C:", "D:")):
                    options.append(line.strip())
                elif line.lower().startswith("correct"):
                    correct = line.split(":")[-1].strip().upper()
                    if correct not in ["A", "B", "C", "D"]:
                        correct = "A"

            if not question:
                raise ValueError("No question found in response")
            if len(options) < 4:
                raise ValueError(f"Only {len(options)} options found")

            return {
                "question": question,
                "options": options,
                "correct": correct
            }

        except Exception as e:
            print(f"generate_full_question attempt {attempt + 1} failed: {str(e)}")
            if attempt < 3:
                time.sleep(1)

    raise Exception("Failed to generate question after 4 attempts")
