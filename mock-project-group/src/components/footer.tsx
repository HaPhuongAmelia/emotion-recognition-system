import React from "react";
import { Layout, Typography, Space } from "antd";
import { HeartFilled } from "@ant-design/icons";

const { Footer } = Layout;
const { Text, Link } = Typography;

const EmotionFooter: React.FC = () => {
  return (
    <Footer
      style={{
        background: "#fff",
        textAlign: "center",
        padding: "16px 0",
        borderTop: "1px solid #f0f0f0",
      }}
    >
      <Space direction="vertical" size={4}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          © {new Date().getFullYear()} Emotion Recognition System — Demo version
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Built with <HeartFilled style={{ color: "#ff4d4f" }} /> using{" "}
          <Link href="https://react.dev/" target="_blank">
            React
          </Link>{" "}
          &{" "}
          <Link href="https://ant.design/" target="_blank">
            Ant Design
          </Link>
        </Text>
      </Space>
    </Footer>
  );
};

export default EmotionFooter;
