/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Input,
  Button,
  DatePicker,
  Radio,
  Select,
  message,
  Avatar,
  Row,
  Col,
} from "antd";
import { SmileOutlined, UserOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

/**
 * PersonalInfor (PersonalInfo) component
 * Props:
 *  - profile: user profile object or null
 *  - setProfile: setter returned from useState
 *  - onSave: callback to persist changes
 */

interface User {
  id?: number;
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
}

interface PersonalInfoProps {
  profile: User | null;
  setProfile: React.Dispatch<React.SetStateAction<User | null>>;
  onSave: () => void;
}

export default function PersonalInfo({
  profile,
  setProfile,
  onSave,
}: PersonalInfoProps) {
  const [dob, setDob] = useState<Dayjs | null>(
    profile?.birthDay ? dayjs(profile.birthDay, "YYYY-MM-DD") : null
  );
  const [loading, setLoading] = useState(false);
  const baselineRef = useRef<Partial<User> | null>(null);

  // pick the editable fields for baseline comparison
  const pickEditable = (u: User | null) =>
    u
      ? {
          firstName: u.firstName ?? "",
          lastName: u.lastName ?? "",
          nickName: u.nickName ?? "",
          gender: u.gender ?? "",
          nationality: u.nationality ?? "",
          birthDay: u.birthDay ?? "",
        }
      : null;

  useEffect(() => {
    if (profile && !baselineRef.current) {
      baselineRef.current = pickEditable(profile);
    }
    // if profile becomes null, clear baseline
    if (!profile) baselineRef.current = null;
  }, [profile]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    const cur = pickEditable(profile);
    if (!baselineRef.current) return Boolean(cur && Object.values(cur).some((v) => v));
    return JSON.stringify(cur) !== JSON.stringify(baselineRef.current);
  }, [profile]);

  const handleSave = async () => {
    if (!hasChanges) {
      message.warning("Không có thay đổi để lưu");
      return;
    }
    setLoading(true);
    try {
      await Promise.resolve(onSave()); // allow onSave to be async or sync
      message.success({
        content: "Cập nhật hồ sơ thành công",
        icon: <SmileOutlined />,
      });
      baselineRef.current = pickEditable(profile);
    } catch (err) {
      console.error("Save failed:", err);
      message.error("Lưu thất bại, thử lại sau");
    } finally {
      setLoading(false);
    }
  };

  // helper to update a single field safely
  const updateField = (field: keyof User, value: any) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <Card
      title={<span className="text-base font-semibold text-gray-700">Personal Information</span>}
      bordered={false}
      className="shadow-md rounded-2xl bg-white"
    >
      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar size={80} icon={<UserOutlined />} className="bg-blue-100 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold">
            {(profile?.firstName ?? "") + " " + (profile?.lastName ?? "")}
          </h3>
          <p className="text-sm text-gray-500">{profile?.email ?? ""}</p>
        </div>
      </div>

      {/* First & Last Name */}
      <Row gutter={16}>
        <Col span={12}>
          <label className="block text-sm text-gray-600 mb-1">First Name</label>
          <Input
            placeholder="Enter first name"
            value={profile?.firstName ?? ""}
            onChange={(e) => updateField("firstName", e.target.value)}
          />
        </Col>
        <Col span={12}>
          <label className="block text-sm text-gray-600 mb-1">Last Name</label>
          <Input
            placeholder="Enter last name"
            value={profile?.lastName ?? ""}
            onChange={(e) => updateField("lastName", e.target.value)}
          />
        </Col>
      </Row>

      {/* Nickname */}
      <div className="mt-4">
        <label className="block text-sm text-gray-600 mb-1">Nickname</label>
        <Input
          placeholder="Enter nickname"
          value={profile?.nickName ?? ""}
          onChange={(e) => updateField("nickName", e.target.value)}
        />
      </div>

      {/* Date of Birth */}
      <div className="mt-4">
        <label className="block text-sm text-gray-600 mb-1">Date of Birth</label>
        <DatePicker
          style={{ width: "100%" }}
          placeholder="Select your birth date"
          value={dob}
          format="DD/MM/YYYY"
          onChange={(date: Dayjs | null) => {
            setDob(date);
            if (date) {
              const birthDay = date.format("YYYY-MM-DD");
              const [year, month, day] = birthDay.split("-");
              updateField("birthDay", birthDay);
              updateField("day", day);
              updateField("month", month);
              updateField("year", year);
            } else {
              // cleared
              updateField("birthDay", undefined);
              updateField("day", undefined);
              updateField("month", undefined);
              updateField("year", undefined);
            }
          }}
        />
      </div>

      {/* Gender */}
      <div className="mt-4">
        <label className="block text-sm text-gray-600 mb-1">Gender</label>
        <Radio.Group
          value={profile?.gender ?? undefined}
          onChange={(e) => updateField("gender", e.target.value)}
        >
          <Radio value="Nam">Male</Radio>
          <Radio value="Nữ">Female</Radio>
          <Radio value="Khác">Other</Radio>
        </Radio.Group>
      </div>

      {/* Nationality */}
      <div className="mt-4">
        <label className="block text-sm text-gray-600 mb-1">Nationality</label>
        <Select
          style={{ width: "100%" }}
          value={profile?.nationality ?? undefined}
          onChange={(value) => updateField("nationality", value)}
          options={[
            { value: "Việt Nam", label: "Vietnam" },
            { value: "Japan", label: "Japan" },
            { value: "USA", label: "United States" },
            { value: "Korea", label: "Korea" },
          ]}
          placeholder="Select nationality"
        />
      </div>

      {/* Save button */}
      <div className="mt-6 text-right">
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          disabled={!hasChanges || loading}
          loading={loading}
        >
          Save Changes
        </Button>
      </div>
    </Card>
  );
}
