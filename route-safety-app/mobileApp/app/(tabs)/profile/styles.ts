import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  // Профиль
  profileContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  // Секция маршрутов
  routesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  routeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  routeCardHeader: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  routeCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f7ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  routeCardContent: {
    flex: 1,
  },
  routeCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  routeCardDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  routeCardMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeCardMetaText: {
    fontSize: 12,
    color: "#999",
    marginRight: 8,
  },
  routeCardDelete: {
    padding: 8,
    marginLeft: 8,
  },
  // Авторизация
  authContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 30,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    padding: 4,
    marginBottom: 30,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#007AFF",
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
