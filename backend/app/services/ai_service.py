import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

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
        if "```" in text:
            text = text.split("```")[1].strip()

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

    STRICT REQUIREMENTS:
    - Return ONLY JSON
    - No explanation
    - No markdown
    - Format EXACTLY like:

    [
        {{
            "question_text": "...",
            "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
            "correct": "A"
        }}
    ]
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

        for q in questions:
            if "question_text" not in q or "options" not in q or "correct" not in q:
                raise ValueError("Invalid question format from AI")

        return questions

    except Exception as e:
        print("AI RAW OUTPUT:", text)
        raise Exception(f"AI full exam parsing failed: {str(e)}")


def generate_full_question(topic):
    prompt = f"""
    Generate ONE multiple choice question on topic: {topic}

    Strict format:
    Question: <question>
    A: <option A>
    B: <option B>
    C: <option C>
    D: <option D>
    Correct: <A/B/C/D>
    """

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt,
    )

    text = response.text.strip()
    print("\nAI RAW RESPONSE:\n", text)

    lines = text.split("\n")

    question = ""
    options = []
    correct = "A"

    for line in lines:
        if line.startswith("Question:"):
            question = line.replace("Question:", "").strip()
        elif line.startswith(("A:", "B:", "C:", "D:")):
            options.append(line)
        elif "Correct" in line:
            correct = line.split(":")[-1].strip()

    if len(options) < 4:
        raise Exception("AI response parsing failed")

    return {
        "question": question,
        "options": options,
        "correct": correct
    }
