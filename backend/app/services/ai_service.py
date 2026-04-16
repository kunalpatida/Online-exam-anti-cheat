import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def clean_json(text):
    if not text:
        raise ValueError("Empty AI response")

    text = text.strip()

    # remove markdown blocks
    if "```" in text:
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text

    start = text.find("[")
    end = text.rfind("]") + 1

    if start == -1 or end == -1:
        raise ValueError("JSON not found")

    return text[start:end]


def generate_wrong_options(question, correct_answer):
    prompt = f"""
    Generate exactly 3 wrong options.

    Question: {question}
    Correct Answer: {correct_answer}

    Return ONLY JSON array.
    """

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt,
    )

    try:
        text = clean_json(response.text)
        options = json.loads(text)

        if not isinstance(options, list) or len(options) != 3:
            raise ValueError("Invalid format")

        return options

    except Exception as e:
        print("AI ERROR:", response.text)
        raise Exception(f"AI parsing failed: {str(e)}")


def generate_full_exam(subject, topic, difficulty, count):
    prompt = f"""
    Generate {count} MCQ questions.

    Subject: {subject}
    Topic: {topic}
    Difficulty: {difficulty}

    Return ONLY JSON:
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
        text = clean_json(response.text)
        questions = json.loads(text)

        for q in questions:
            if "question_text" not in q or "options" not in q or "correct" not in q:
                raise ValueError("Bad format")

        return questions

    except Exception as e:
        print("AI RAW:", response.text)
        raise Exception(f"AI parsing failed: {str(e)}")


def generate_full_question(topic):
    prompt = f"""
    Generate one MCQ.

    Topic: {topic}

    Format:
    Question: ...
    A: ...
    B: ...
    C: ...
    D: ...
    Correct: A
    """

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt,
    )

    text = response.text.strip()
    print("AI RAW:", text)

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
        raise Exception("AI parsing failed")

    return {
        "question": question,
        "options": options,
        "correct": correct
    }
