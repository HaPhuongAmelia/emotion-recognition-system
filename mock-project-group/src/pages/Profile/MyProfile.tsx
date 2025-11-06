/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../contexts";
import Password from "antd/es/input/Password";
import AccountInfo from "../../components/Profile/AccountInfor";
import PersonalInfo from "../../components/Profile/PersonalInfor";

interface User {
  id: number;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  address: string;
  birthDay: string;
  firstName: string;
  lastName: string;
  gender: string;
  nickName: string;
  phoneNumber: string;
  nationality: string;
  day?: string;
  month?: string;
  year?: string;
}

export default function UserProfile() {
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [editingField, setEditingField] = useState<"phone" | "email" | null>(null);

  // Lấy dữ liệu user theo id
  useEffect(() => {
    if (user?.id && token) {
      axios
        .get<User>(`http://localhost:3000/users/${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          const data = res.data;
          if (data.birthDay) {
            const [year, month, day] = data.birthDay.split("-");
            setProfile({ ...data, day, month, year });
          } else {
            setProfile(data);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [user, token]);

  // Hàm update user
  const handleSave = async () => {
    if (!profile) return;

    try {
      // Ghép birthDay từ day-month-year 
      const birthDay =
        profile.year && profile.month && profile.day
          ? `${profile.year}-${profile.month}-${profile.day}`
          : undefined; // undefined thì không gửi

      //gửi các field thay đổi
      const payload: any = {
        ...(profile.firstName && { firstName: profile.firstName }),
        ...(profile.lastName && { lastName: profile.lastName }),
        ...(profile.nickName && { nickName: profile.nickName }),
        ...(birthDay && { birthDay }),
        ...(profile.phoneNumber && { phoneNumber: profile.phoneNumber }),
        ...(profile.email && { email: profile.email }),
        ...(profile.nationality && { nationality: profile.nationality }),
      };

      await axios.patch(`http://localhost:3000/users/${profile.id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Cập nhật thành công!");
      setEditingField(null);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Có lỗi xảy ra khi cập nhật!");
    }
  };

  if (loading) return <p>Đang tải...</p>;
  if (!user) return <p>Không có dữ liệu</p>;



  return (
    <div className="min-h-screen bg-gray-50 items-center justify-center p-6">
      <div>
        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          Thông tin tài khoản
        </h2>
      </div>
      <div className="bg-white w-full max-w-6xl rounded-lg border-none shadow-sm p-4">
        {/* Grid chia 2 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%]  gap-8">
          {/*Thông tin cá nhân */}
          <PersonalInfo profile={profile} setProfile={setProfile} onSave={handleSave} />

          {/*Số điện thoại + Email */}
          <AccountInfo
            phoneNumber={profile?.phoneNumber}
            email={profile?.email}
            editingField={editingField}
            setEditingField={setEditingField}
            onChange={(field, value) =>
              setProfile((prev) =>
                prev ? { ...prev, [field]: value } : prev
              )
            }
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  );
}
