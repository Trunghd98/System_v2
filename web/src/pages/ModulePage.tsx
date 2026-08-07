export default function ModulePage({ ten }: { ten: string }) {
  return (
    <div className="tcnf-card">
      <h2 style={{ color: "var(--navy)", marginTop: 0 }}>{ten}</h2>
      <p style={{ color: "var(--ink-soft)" }}>
        Trang chức năng này sẽ được xây dựng ở GĐ8.
      </p>
    </div>
  );
}
