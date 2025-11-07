import React from "react";
import { Input, Button, message, Card } from "antd";
import { EditOutlined, SaveOutlined, SmileOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";

interface AccountInfoProps {
  phoneNumber?: string;
  email?: string;
  editingField: "phone" | "email" | null;
  setEditingField: React.Dispatch<React.SetStateAction<"phone" | "email" | null>>;
  onChange: (field: "phoneNumber" | "email", value: string) => void;
  onSave: () => void;
}

export default function AccountInfo({
  phoneNumber,
  email,
  editingField,
  setEditingField,
  onChange,
  onSave,
}: AccountInfoProps) {
  // Khi lưu thành công hiển thị phản hồi cảm xúc
  const handleSave = () => {
    onSave();
    message.success({
      content: "Your information has been updated successfully 😊",
      icon: <SmileOutlined />,
      duration: 2,
    });
  };

  return (
    <Card
      title={<span className="text-base font-semibold text-gray-700">Account Information</span>}
      bordered={false}
      className="shadow-md rounded-2xl bg-white"
    >
      {/* PHONE */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <PhoneOutlined className="text-blue-500 text-lg" />
          <div>
            <p className="text-sm text-gray-500">Phone Number</p>
            {editingField === "phone" ? (
              <Input
                value={phoneNumber || ""}
                onChange={(e) => onChange("phoneNumber", e.target.value)}
                placeholder="Enter your phone number"
                className="w-64"
              />
            ) : (
              <p className="text-gray-800 text-sm">{phoneNumber || "Not provided"}</p>
            )}
          </div>
        </div>

        <Button
          type={editingField === "phone" ? "primary" : "default"}
          icon={editingField === "phone" ? <SaveOutlined /> : <EditOutlined />}
          onClick={() =>
            editingField === "phone" ? handleSave() : setEditingField("phone")
          }
        >
          {editingField === "phone" ? "Save" : "Edit"}
        </Button>
      </div>

      {/* EMAIL */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MailOutlined className="text-blue-500 text-lg" />
          <div>
            <p className="text-sm text-gray-500">Email Address</p>
            {editingField === "email" ? (
              <Input
                type="email"
                value={email || ""}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="Enter your email"
                className="w-64"
              />
            ) : (
              <p className="text-gray-800 text-sm">{email || "Not provided"}</p>
            )}
          </div>
        </div>

        <Button
          type={editingField === "email" ? "primary" : "default"}
          icon={editingField === "email" ? <SaveOutlined /> : <EditOutlined />}
          onClick={() =>
            editingField === "email" ? handleSave() : setEditingField("email")
          }
        >
          {editingField === "email" ? "Save" : "Edit"}
        </Button>
      </div>
    </Card>
  );
}
