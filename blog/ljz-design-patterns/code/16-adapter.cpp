// g++ -std=c++17 -o demo 16-adapter.cpp
#include <iostream>

class Adaptee {
public:
  void specificRequest() { std::cout << "specific request\n"; }
};

class Target {
public:
  virtual void request() = 0;
  virtual ~Target() = default;
};

class Adapter : public Target {
  Adaptee adaptee_;
public:
  void request() override { adaptee_.specificRequest(); }
};

int main() {
  Adapter a;
  a.request();
  return 0;
}
