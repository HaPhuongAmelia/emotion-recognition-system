import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/footer';
import Header from '../components/header';
const NotFound: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div>
            <Header simulateBackend={false} onToggleSimulate={function (): void {
                throw new Error('Function not implemented.');
            } } onReset={function (): void {
                throw new Error('Function not implemented.');
            } } />
            <div className="min-h-[60vh] flex items-center justify-center px-4 mb-8">
                <div className="text-center max-w-xl">
                    <h1 className="text-7xl font-extrabold text-blue-600">404</h1>
                    <p className="mt-4 text-2xl font-semibold text-gray-800">Trang không tồn tại</p>
                    <p className="mt-2 text-gray-600">Có vẻ bạn đã truy cập một đường dẫn không hợp lệ hoặc trang đã bị di chuyển.</p>
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <Link
                            to="/"
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
                        >
                            Về trang chủ
                        </Link>
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
                        >
                            Quay lại
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default NotFound;
