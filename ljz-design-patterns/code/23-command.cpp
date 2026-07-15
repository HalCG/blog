// g++ -std=c++17 -o demo 23-command.cpp
#include <iostream>
#include <memory>
#include <stack>

class Light {
  bool on_ = false;
public:
  void on()  { on_ = true;  std::cout << "light on\n"; }
  void off() { on_ = false; std::cout << "light off\n"; }
};

class Command {
public:
  virtual void execute() = 0;
  virtual void undo() = 0;
  virtual ~Command() = default;
};

class LightOnCommand : public Command {
  Light& light_;
public:
  explicit LightOnCommand(Light& l) : light_(l) {}
  void execute() override { light_.on(); }
  void undo() override { light_.off(); }
};

class Invoker {
  std::stack<std::unique_ptr<Command>> history_;
public:
  void submit(std::unique_ptr<Command> cmd) {
    cmd->execute();
    history_.push(std::move(cmd));
  }
  void undo() {
    if (history_.empty()) return;
    history_.top()->undo();
    history_.pop();
  }
};

int main() {
  Light light;
  Invoker inv;
  inv.submit(std::make_unique<LightOnCommand>(light));
  inv.undo();
  return 0;
}
