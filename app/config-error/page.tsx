import { Card, CardBody, CardHeader } from "@nextui-org/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { validateEnvironment, getEnvErrorMessage } from "@/lib/env-validation";

export default function ConfigErrorPage() {
  const validation = validateEnvironment();
  const errorMessage = getEnvErrorMessage(validation);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-2xl w-full">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configuration Error</h2>
              <p className="text-sm text-gray-600">Missing required environment variables</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <div className="space-y-4">
            <p className="text-gray-700">
              The application is missing required environment variables. Please configure your
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">.env.local</code> file.
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">Missing Variables:</h3>
              <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
                {errorMessage}
              </pre>
            </div>

            {validation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Warnings:</h3>
                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                  {validation.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Copy <code className="bg-blue-100 px-1 rounded">.env.example</code> to <code className="bg-blue-100 px-1 rounded">.env.local</code></li>
                <li>Fill in all required environment variables</li>
                <li>Restart your development server</li>
                <li>Check the <a href="/api/health" className="underline">health endpoint</a> to verify configuration</li>
              </ol>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                For more information, see <code className="bg-gray-100 px-1 rounded">ENV_SETUP.md</code> or <code className="bg-gray-100 px-1 rounded">ENV_TEMPLATE.md</code>
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

