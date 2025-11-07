/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { Layout, Typography, Space, Switch, Button, Tooltip } from "antd";
import { CameraOutlined, ReloadOutlined, CiOutlined } from "@ant-design/icons";

const { Header } = Layout;
const { Title, Text } = Typography;

interface EmotionHeaderProps {
  simulateBackend: boolean;
  onToggleSimulate: () => void;
  onReset: () => void;
}

const EmotionHeader: React.FC<EmotionHeaderProps> = ({
  simulateBackend,
  onToggleSimulate,
  onReset,
}) => {
  return (
    <Header
      style={{
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        padding: "0 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Left side */}
      <Space align="center">
        <div
          style={{
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            borderRadius: 12,
            padding: 8,
          }}
        >
          <CameraOutlined style={{ color: "#fff", fontSize: 24 }} />
        </div>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Emotion Recognition Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Demo interface — simulated backend mode
          </Text>
        </div>
      </Space>

      {/* Right side */}
      <Space size="middle" align="center">
        <Tooltip title="Toggle simulated backend">
          <Space>
            <CiOutlined style={{ color: "#595959" }} />
            <Text type="secondary">Simulate BE</Text>
            <Switch checked={simulateBackend} onChange={onToggleSimulate} />
          </Space>
        </Tooltip>

        <Tooltip title="Reset statistics">
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={onReset}
            style={{
              borderRadius: 10,
              background: "#fff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          >
            Reset
          </Button>
        </Tooltip>
      </Space>
    </Header>
  );
};

export default EmotionHeader;
