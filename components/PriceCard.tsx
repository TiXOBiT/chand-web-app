import { ArrowUp } from 'lucide-react';

interface PriceCardProps {
  title: string;
  code: string;
  price: number | null;
  isSelected: boolean;
  onClick: () => void;
}

export default function PriceCard({ title, code, price, isSelected, onClick }: PriceCardProps) {
  return (
    <div 
      onClick={onClick}
      className={\elative p-5 rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden \\}
    >
      <div className='flex justify-between items-start'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white'>
            {code.substring(0, 2)}
          </div>
          <div>
            <h3 className='text-sm font-medium text-gray-300'>{title}</h3>
            <span className='text-xs text-gray-500'>{code}</span>
          </div>
        </div>
      </div>

      <div className='mt-4'>
        <div className='flex items-center gap-1 text-xs text-green-500 mb-1'>
           <ArrowUp size={12} />
           <span>Live</span> 
        </div>
        <div className='text-2xl font-bold text-white tracking-wide'>
            {price ? price.toLocaleString() : '---'}
        </div>
      </div>
    </div>
  );
}
