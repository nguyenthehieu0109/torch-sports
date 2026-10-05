import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-4xl font-bold mb-8 text-black">TORCH SPORTS</h1>
      <p className="mb-8 text-gray-600 max-w-md text-center">
        Nền tảng thương mại điện tử chuyên bán dụng cụ và trang phục thể thao đa bộ môn.
      </p>
      <Link href="/login" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
        Đi đến trang Đăng Nhập
      </Link>
    </div>
  );
}
