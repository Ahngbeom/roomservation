import { useParams } from 'react-router-dom';

export const ReservationDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">예약 상세 정보</h1>
      <p className="text-gray-600">예약 ID: {id} (구현 예정)</p>
    </div>
  );
};
