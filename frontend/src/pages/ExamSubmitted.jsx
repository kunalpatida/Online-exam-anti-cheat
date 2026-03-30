import { useLocation } from "react-router-dom";

export default function ExamSubmitted() {

  const location = useLocation();
  const result = location.state?.result;

  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-200">

      <div className="bg-white p-10 rounded-xl shadow-xl text-center max-w-lg">

        <h1 className="text-3xl font-bold text-green-600 mb-4">
          Exam Submitted Successfully
        </h1>

        <p className="text-gray-600 mb-6">
          Your responses have been recorded.
        </p>

        {result && (

          <div className="bg-gray-100 p-6 rounded-lg mt-4">

            <h2 className="text-xl font-semibold mb-2">
              Your Result
            </h2>

            <p className="text-lg">
              Score: <b>{result.score}</b>
            </p>

          </div>

        )}

      </div>

    </div>

  );

}