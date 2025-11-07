/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Spin, message } from "antd";
import { useAuth } from "../../contexts/AuthContext";
import AccountInfo from "../../components/Profile/AccountInfor";
import PersonalInfo from "../../components/Profile/PersonalInfor";

type ProfileType = {
  id?: string | number;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  address?: string;
  birthDay?: string; // ISO yyyy-mm-dd
  firstName?: string;
  lastName?: string;
  gender?: string;
  nickName?: string;
  phoneNumber?: string;
  nationality?: string;
  day?: string;
  month?: string;
  year?: string;
  name?: string;
  [k: string]: any;
};

const USERS_API =
  (import.meta.env.VITE_API_USERS_URL as string) ||
  (import.meta.env.VITE_BASE_URL
    ? `${(import.meta.env.VITE_BASE_URL as string).replace(/\/$/, "")}/users`
    : "http://localhost:3000/users");

export default function MyProfile() {
  const auth = useAuth();
  const { user, token } = auth;
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingField, setEditingField] = useState<"phone" | "email" | null>(null);

  // helper to safely pad month/day
  const pad = (s?: string | number) => {
    if (s == null) return undefined;
    const n = Number(s);
    if (!Number.isFinite(n)) return String(s);
    return n < 10 ? `0${n}` : String(n);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const base = (USERS_API as string).replace(/\/$/, "");
        const res = await axios.get<ProfileType>(`${base}/${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = res.data ?? {};
        // Normalize birthDay -> day/month/year fields for UI components
        let normalized: ProfileType = { ...data };
        const bd = data.birthDay ?? data.birthday ?? data.birth_date ?? "";
        if (bd) {
          const parts = String(bd).split("-").map((p) => p.trim());
          if (parts.length >= 3) {
            const [y, m, d] = parts;
            normalized = { ...normalized, day: pad(d), month: pad(m), year: y };
          } else {
            // try parsing as Date
            const dt = new Date(bd);
            if (!Number.isNaN(dt.getTime())) {
              normalized = {
                ...normalized,
                year: String(dt.getFullYear()),
                month: pad(String(dt.getMonth() + 1)),
                day: pad(String(dt.getDate())),
              };
            }
          }
        }
        setProfile(normalized);
      } catch (error) {
        console.error("Error fetching user:", error);
        message.error("Không thể tải thông tin người dùng!");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token]);

  const handleSave = async () => {
    if (!profile || !token) {
      message.warning("Không có dữ liệu để cập nhật!");
      return;
    }

    try {
      // Build birthDay if day/month/year provided
      let birthDay: string | undefined = undefined;
      if (profile.year && profile.month && profile.day) {
        const y = String(profile.year).padStart(4, "0");
        const m = pad(profile.month) ?? "01";
        const d = pad(profile.day) ?? "01";
        birthDay = `${y}-${m}-${d}`;
      } else if (profile.birthDay) {
        birthDay = profile.birthDay;
      }

      // Only include fields that have meaningful values
      const payload: Record<string, any> = {
        ...(profile.firstName ? { firstName: profile.firstName } : {}),
        ...(profile.lastName ? { lastName: profile.lastName } : {}),
        ...(profile.nickName ? { nickName: profile.nickName } : {}),
        ...(birthDay ? { birthDay } : {}),
        ...(profile.phoneNumber ? { phoneNumber: profile.phoneNumber } : {}),
        ...(profile.email ? { email: profile.email } : {}),
        ...(profile.nationality ? { nationality: profile.nationality } : {}),
        ...(profile.address ? { address: profile.address } : {}),
        ...(profile.gender ? { gender: profile.gender } : {}),
      };

      const base = (USERS_API as string).replace(/\/$/, "");
      const res = await axios.patch(`${base}/${profile.id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const updated = res.data ?? { ...profile, ...payload };
      // Update UI state
      // Normalize returned birthDay
      let updatedNormalized: ProfileType = { ...updated };
      const returnedBD = updated.birthDay ?? updated.birthday ?? updated.birth_date;
      if (returnedBD) {
        const parts = String(returnedBD).split("-");
        if (parts.length >= 3) {
          const [y, m, d] = parts;
          updatedNormalized = { ...updatedNormalized, year: y, month: pad(m), day: pad(d) };
        }
      }

      setProfile(updatedNormalized);

      // Also update AuthContext / localStorage user if token exists
      try {
        const currentUser = tryParseLocalUser();
        const mergedUser = { ...(currentUser ?? {}), ...updatedNormalized };
        // If auth.login is available and token exists, refresh user in context
        if (auth?.login && token) {
          auth.login({ user: mergedUser, token, refreshToken: auth.refreshToken ?? undefined });
        } else {
          // fallback: update localStorage directly
          localStorage.setItem("user", JSON.stringify(mergedUser));
        }
      } catch (e) {
        // ignore
      }

      message.success("Cập nhật thông tin thành công!");
      setEditingField(null);
    } catch (error) {
      console.error("Error updating user:", error);
      message.error("Có lỗi xảy ra khi cập nhật!");
    }
  };

  // helper to safely read localStorage user
  const tryParseLocalUser = (): ProfileType | null => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      return JSON.parse(raw) as ProfileType;
    } catch {
      return null;
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );

  if (!user || !profile)
    return (
      <div className="text-center mt-10 text-gray-500">Không tìm thấy dữ liệu người dùng</div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex justify-center">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Thông tin tài khoản</h2>

        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8">
          {/* Thông tin cá nhân */}
          <PersonalInfo
            profile={profile as any}            // tạm nếu bạn chưa muốn sửa type
            setProfile={setProfile as any}
            onSave={handleSave}
          />

          {/* Thông tin tài khoản (Email + SĐT) */}
          <AccountInfo
            phoneNumber={profile.phoneNumber}
            email={profile.email}
            editingField={editingField}
            setEditingField={setEditingField}
            onChange={(field: string, value: any) =>
              setProfile((prev) => (prev ? { ...prev, [field]: value } : prev))
            }
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  );
}
