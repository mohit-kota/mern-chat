import axios from "axios";
import { createContext, useEffect, useState } from "react"

export const UserContext = createContext({})

export function UserContextProvider({children}){

    const [username,setUserName] = useState('');
    const [id,setId] = useState('');
    useEffect(()=>{
        axios.get('/profile',{withCredentials:true}).then((response) =>{
           setId(response.data.userId);
           setUserName(response.data.username);
        })
    },[])
    return (
        <UserContext.Provider value={{username, setUserName, id, setId}}>
            {children}
        </UserContext.Provider>
    )

}