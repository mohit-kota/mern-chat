import { useContext, useState } from "react"
import axios from "axios";
import { UserContext } from "./UserContext";

export default function RegisterAndLoginForm(){

    const [username,setUserName] = useState('');
    const [password,setPassword] = useState('');
    const [isLoginOrRegistered,setIsLoginOrRegistered] = useState('login');
    const {setUserName:setLoggedInUsername,setId} = useContext(UserContext);
    
    async function handleSubmit(ev){
        ev.preventDefault();
        const url = isLoginOrRegistered==='register'?'/register':'/login';
            const {data} = await axios.post(url,{username,password});
            setLoggedInUsername(username);
            setId(data.id);
      
        
       
    }
    return (
       <div className="bg-blue-50 h-screen flex items-center">
            <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
                <input type="text" placeholder="username"   
                value={username}
                onChange={ev => setUserName(ev.target.value)}  className="block w-full rounded-2xl p-2 mb-2 border"/>
                <input type="password" placeholder="password"
                value={password}
                onChange={ev => setPassword(ev.target.value)} className="block w-full  rounded-2xl p-2 mb-2 border "/>
                
                
                <button className="bg-blue-500 text-white block w-full rounded-full">{isLoginOrRegistered==='register' ? 'Register':'Login'}</button>
            
                <div className="text-center mt-2">
                     
                    {isLoginOrRegistered==='register' && (
                        <div>
                            Already a member?
                            <button onClick={()=>setIsLoginOrRegistered('login')} >
                            Login here
                            </button> 
                        </div>
                    )}
                    {isLoginOrRegistered==='login' && (
                        <div>
                            Don't have an account?
                            <button onClick={()=>setIsLoginOrRegistered('register')} >
                            Register
                            </button> 
                        </div>
                    )}
                    
                   
                </div>
            </form>
       </div>
    )

}