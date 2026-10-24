import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import RouteBoundary from './RouteBoundary';
export default function RouteFrame({children}){
 const {pathname}=useLocation();
 useEffect(()=>{window.scrollTo(0,0);document.getElementById('page-content')?.focus({preventScroll:true});},[pathname]);
 return <RouteBoundary key={pathname}>{children}</RouteBoundary>;
}
