import { Link } from 'react-router-dom';

export const HomePage = () => {
  return (
    <div className="px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">환영합니다</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/rooms"
          className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">방 찾기</h2>
          <p className="text-gray-600">예약 가능한 방을 검색하고 예약하세요.</p>
        </Link>
        <Link
          to="/reservations"
          className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">내 예약</h2>
          <p className="text-gray-600">예약 내역을 확인하고 관리하세요.</p>
        </Link>
      </div>
    </div>
  );
};
