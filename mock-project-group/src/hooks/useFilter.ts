// src/hooks/useFilter.ts

import { useSearchParams } from 'react-router-dom';

const useFilter = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Lấy giá trị từ URL
    const filters = {
        now: searchParams.get('now') === 'true',
        topDeal: searchParams.get('topDeal') === 'true',
        freeship: searchParams.get('freeship') === 'true',
        fiveStars: searchParams.get('fiveStars') === 'true',
        fourStars: searchParams.get('fourStars') === 'true',
        threeStars: searchParams.get('threeStars') === 'true',
    };
    const sortBy = searchParams.get('sortBy') || 'popular'; // Giá trị mặc định là 'popular'

    // Hàm cập nhật bộ lọc
    const setFilters = (newFilters: { [x: string]: any; }) => {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        for (const key in newFilters) {
            if (newFilters[key]) {
                newSearchParams.set(key, 'true');
            } else {
                newSearchParams.delete(key);
            }
        }
        setSearchParams(newSearchParams);
    };

    // Hàm cập nhật sắp xếp
    const setSortBy = (newSortBy: string) => {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        if (newSortBy) {
            newSearchParams.set('sortBy', newSortBy);
        } else {
            newSearchParams.delete('sortBy');
        }
        setSearchParams(newSearchParams);
    };

    return { filters, sortBy, setFilters, setSortBy };
};

export default useFilter;