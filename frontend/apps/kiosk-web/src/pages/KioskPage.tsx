import { useState } from 'react';

export const KioskPage = () => {
  const [mode, setMode] = useState<'qr' | 'pin'>('qr');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8">방 입장 시스템</h1>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex space-x-4 mb-8">
            <button
              onClick={() => setMode('qr')}
              className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                mode === 'qr'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              QR 코드 스캔
            </button>
            <button
              onClick={() => setMode('pin')}
              className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                mode === 'pin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              PIN 입력
            </button>
          </div>

          {mode === 'qr' ? (
            <div className="text-center py-12">
              <div className="w-64 h-64 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                <p className="text-gray-500">QR 스캔 영역 (구현 예정)</p>
              </div>
              <p className="text-gray-600">QR 코드를 스캔해주세요</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-sm mx-auto">
                <input
                  type="text"
                  placeholder="PIN 코드 입력"
                  className="w-full text-3xl text-center py-4 px-6 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  maxLength={6}
                />
                <p className="text-gray-600 mt-4">6자리 PIN 코드를 입력해주세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
