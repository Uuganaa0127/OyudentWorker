// Code: API үндсэн үйлдлийг хийх функцуудыг агуулсан файл

import { message } from "antd";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

// import { useRouter } from "next/navigation"; // ✅ Import Next.js router
// Өөрийн ашиглах гэж буй URL-г .env файлд хадгалж байгаа
// const url = import.meta.env.VITE_REACT_APP_SECRET_PROD_URL;
// const url = "process.env.REACT_APP_API_URL/v1";

const url = `${import.meta.env.VITE_API_URL}/v1`;

console.log(url,'url');
export default class Api {
  
  service = (type) => {
    const headers = {
      "Content-Type": type || "application/json",
    };
  
    const accessToken = getTokenFromCookie();
  
    if (accessToken) {
      
      headers.Authorization = `Bearer ${accessToken}`;
    }
  
    this.client = axios.create({
      baseURL: url,
      timeout: 60000,
      headers,
    });
  
    this.client.interceptors.request.use(
      (config) => config,
      (error) => Promise.reject(error)
    );
  
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_Token");
          localStorage.removeItem("token_Expire");
        //   window.location.href = "/auth/sign-in";
        }
        return Promise.reject(error); // ✅ important: reject to avoid silent errors
      }
    );
  
    return this.client;
  };
  
}

const api = new Api();
function callPost(path, data, type, handler) {
  return api
    .service(type)
    .post(path, data)
    .then((response) => {
      if (handler) {
        return response;
      }
      // response code 200 өөр хариу ирсэн тохиолдолд амжилтгүй гэж үзэж байгаа
      if (response?.status <= 200 || response?.status > 299) {
        message.error(response?.data?.message);
        return;
      }
      return response?.data;
    });
    
}


export const signInUser = async (userData, isClient) => {

  

  const endpoint = "auth/login";

  try {
    const response = await fetch(`${url}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Signin failed.");
    }

    // ✅ Save token
    const token = data.access_token;


    if (!token) throw new Error("No token returned from server");

    // ✅ Save to cookie for 1 day
    document.cookie = `auth_token=${token}; Path=/; Max-Age=86400; SameSite=Lax`;




    // ✅ Decode token for roles
    const decoded = jwtDecode(token);
    console.log("Decoded token:", decoded);

    const roles = decoded?.roles || [];

    // ✅ Optional: redirect based on role
    if (typeof window !== "undefined") {
      if (roles.includes("admin")) {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/user/home";
      }
    }

    return data;
  } catch (error) {
    console.error("Signin Error:", error);
    throw error;
  }
};

export const signUpUser = async (userData, isClient) => {
  if (userData.password !== userData.passwordMatch) {
    throw new Error("Passwords do not match.");
  }

  const endpoint = isClient
    ? "auth/register/client"
    : "auth/register/";

  try {
    const response = await fetch(`${url}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      // You can customize this to match your API error format
      throw new Error(data.message || "Signup failed.");
    }

    return data;
  } catch (error) {
    console.error("Signup Error:", error);
    throw error;
  }
};


function callPatch(path, data, handler) {
  return api
    .service()
    .patch(path, data)
    .then((response) => {
      if (handler) {
        return response;
      }
      if (response?.status !== 200) {
        message.error(response?.data?.message);
        return;
      }
      return response?.data;
    });
}


function  getTokenFromCookie ()  {
  try {
    const cookies = document.cookie.split("; ").reduce((acc, cookie) => {
      const [name, value] = cookie.split("=");
      acc[name] = value;

      return acc;
      
    }, {} );

    if (cookies.auth_token) {
      // console.log("Retrieved token from cookie:", cookies.auth_token);
      return cookies.auth_token;
    } else {
      if (typeof window !== "undefined") {
        // window.location.href = "http://localhost:5173/signin"; // ✅ Redirect on client-side
      }
      console.warn("No auth_token found in cookies.");
      return 
    }
  } catch (error) {
    console.error("Error reading token from cookies:", error);
  }

  return null;
};
function callGet(path, responseType = "json") {
  return api
    .service()
    .get(path, { responseType })
    .then((response) => {
      if (response?.status !== 200) {
        message.error(response?.data?.message);
        return;
      }
      return response?.data;
    });
}

function callPut(path, data) {
  return api
    .service()
    .put(path, data)
    .then((response) => {
      if (response?.status !== 200) {
        message.error(response?.data?.message);
        return;
      }
      return response?.data;
    });
}

function callDelete(path, handler) {
  return api
    .service()
    .delete(path)
    .then((response) => {
      if (handler) {
        return response;
      }
      if (response?.status !== 200) {
        message.error(response?.data?.message);
        return;
      }
      return response?.data;
    });
}

export const apiService = {
  getTokenFromCookie,
  callPost,
  callGet,
  callPut,
  callDelete,
  callPatch,
  signUpUser
};
