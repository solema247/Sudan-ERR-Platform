import { useEffect } from 'react';
import { useRouter } from 'next/router';

const Home = () => {
    const router = useRouter();

    useEffect(() => {
        router.push('/login');
    }, [router]);

    return null; // Render nothing while redirecting
};

export default Home;
