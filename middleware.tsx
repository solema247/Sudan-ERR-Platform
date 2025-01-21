// import { NextResponse } from 'next/server';
// import jwt from 'jsonwebtoken';

// export function middleware(req) {
//     const token = req.cookies.get('token');
//     if (!token) {
//         return NextResponse.redirect('/login');
//     }

//     try {
//         jwt.verify(token, process.env.JWT_SECRET);
//         return NextResponse.next(); // Allow the request
//     } catch (error) {
//         return NextResponse.redirect('/login'); // Redirect if invalid
//     }
// }
