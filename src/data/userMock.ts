/** 个人中心：模拟订单 */
export type MockOrder = {
  id: string;
  restaurantName: string;
  orderedAt: string;
  amount: number;
  status: string;
};

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: "o1",
    restaurantName: "SELECT * FROM 炸鸡",
    orderedAt: "2025-03-18 19:32",
    amount: 36,
    status: "已完成",
  },
  {
    id: "o2",
    restaurantName: "寝室长请客火锅",
    orderedAt: "2025-03-10 18:05",
    amount: 268,
    status: "已完成",
  },
];

export const MOCK_USER_PROFILE = {
  nickname: "吃货大学生",
  phoneMasked: "138****1234",
} as const;
