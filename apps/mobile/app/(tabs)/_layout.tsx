import { Tabs } from "expo-router";
import {
  BookIcon,
  CalendarIcon,
  ClockIcon,
  ListIcon,
  PersonIcon,
  TargetIcon,
} from "@/components/icons";
import { C } from "@/components/login/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: C.plum,
        tabBarInactiveTintColor: C.fgFaint,
        tabBarStyle: {
          backgroundColor: C.cream,
          borderTopColor: "rgba(45,27,46,0.08)",
          borderTopWidth: 1,
          height: 64,
          paddingTop: 8,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "today",
          tabBarIcon: ({ color, focused }) => (
            <ClockIcon
              color={color}
              size={22}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "library",
          tabBarIcon: ({ color, focused }) => (
            <BookIcon
              color={color}
              size={22}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "calendar",
          tabBarIcon: ({ color, focused }) => (
            <CalendarIcon
              color={color}
              size={22}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: "lists",
          tabBarIcon: ({ color, focused }) => (
            <ListIcon
              color={color}
              size={22}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "goals",
          tabBarIcon: ({ color, focused }) => (
            <TargetIcon
              color={color}
              size={22}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="year"
        options={{
          title: "year",
          tabBarIcon: ({ color, focused }) => (
            <PersonIcon
              color={color}
              size={22}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
