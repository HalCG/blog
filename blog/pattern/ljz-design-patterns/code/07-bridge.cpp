// g++ -std=c++17 -o demo 07-bridge.cpp
#include <iostream>
#include <memory>

class DrawingAPI {
public:
  virtual void drawCircle(double x, double y, double r) = 0;
  virtual ~DrawingAPI() = default;
};

class DrawingAPI1 : public DrawingAPI {
public:
  void drawCircle(double x, double y, double r) override {
    std::cout << "API1 circle (" << x << "," << y << ") r=" << r << "\n";
  }
};

class Shape {
protected:
  std::unique_ptr<DrawingAPI> api_;
public:
  explicit Shape(std::unique_ptr<DrawingAPI> api) : api_(std::move(api)) {}
  virtual void draw() = 0;
  virtual ~Shape() = default;
};

class Circle : public Shape {
  double x_, y_, r_;
public:
  Circle(double x, double y, double r, std::unique_ptr<DrawingAPI> api)
    : Shape(std::move(api)), x_(x), y_(y), r_(r) {}
  void draw() override { api_->drawCircle(x_, y_, r_); }
};

int main() {
  Circle c(1, 2, 3, std::make_unique<DrawingAPI1>());
  c.draw();
  return 0;
}
