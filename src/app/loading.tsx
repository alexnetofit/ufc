export default function Loading() {
  return (
    <div className="min-h-screen bg-ufc-black flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-ufc-gray-700"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-ufc-red animate-spin"></div>
        </div>
        <p className="text-ufc-gray-400 font-medium">Carregando...</p>
      </div>
    </div>
  );
}


