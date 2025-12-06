export const DashboardPage = () => {
  return (
    <div className="px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">전체 사용자</h3>
          <p className="text-3xl font-bold text-primary mt-2">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">전체 방</h3>
          <p className="text-3xl font-bold text-primary mt-2">-</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">오늘 예약</h3>
          <p className="text-3xl font-bold text-primary mt-2">-</p>
        </div>
      </div>
      <p className="mt-8 text-gray-600">관리자 기능 (구현 예정)</p>
    </div>
  );
};
