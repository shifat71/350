from typing import Any, Dict, List, Optional, TypeVar, Union

from langchain.agents import AgentExecutor
from langchain.agents.format_scratchpad import format_to_openai_function_messages
from langchain.agents.output_parsers import OpenAIFunctionsAgentOutputParser
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import AgentAction, AgentFinish, BaseMessage
from langchain.tools import BaseTool
from langchain.tools.render import format_tool_to_openai_function
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import END, StateGraph
from langgraph.prebuilt.tool_node import ToolNode
from langchain_openai import ChatOpenAI

from src.utils.logger import get_logger

logger = get_logger(__name__)

StateType = TypeVar("StateType", bound=Dict[str, Any])


class BaseAgent:
    """Base agent class for all agents in the system."""

    def __init__(
        self,
        tools: List[BaseTool],
        system_prompt: str,
        model_name: str = "gpt-4-turbo-preview",
    ):
        """Initialize the base agent."""
        self.tools = tools
        self.tool_node = ToolNode(tools)
        self.system_prompt = system_prompt
        self.model_name = model_name

        # Create the agent
        self.agent = self._create_agent()
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors=True,
        )

        # Create the graph
        self.graph = self._create_graph()

    def _create_agent(self) -> Any:
        """Create the agent with tools and prompt."""
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.system_prompt),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )

        llm = ChatOpenAI(model=self.model_name)
        return prompt | llm | OpenAIFunctionsAgentOutputParser()

    def _create_graph(self) -> StateGraph:
        """Create the agent graph."""
        # Define the nodes
        def should_continue(state: StateType) -> Union[str, List[BaseMessage]]:
            """Determine if the agent should continue or finish."""
            messages = state["messages"]
            last_message = messages[-1]

            if isinstance(last_message, AIMessage):
                if "function_call" in last_message.additional_kwargs:
                    return "continue"
                return END

            return "continue"

        def call_model(state: StateType) -> StateType:
            """Call the model to get the next action."""
            messages = state["messages"]
            response = self.agent.invoke(
                {
                    "input": messages[-1].content,
                    "chat_history": messages[:-1],
                    "agent_scratchpad": format_to_openai_function_messages(
                        state["intermediate_steps"]
                    ),
                }
            )
            return {"messages": messages + [response]}

        def call_tool(state: StateType) -> StateType:
            """Call the tool and get the result using ToolNode."""
            messages = state["messages"]
            last_message = messages[-1]
            # Use ToolNode to handle the tool call
            tool_result = self.tool_node.invoke({"messages": messages})
            return {"messages": messages + [tool_result]}

        # Create the graph
        workflow = StateGraph(StateType)

        # Add the nodes
        workflow.add_node("agent", call_model)
        workflow.add_node("action", call_tool)

        # Add the edges
        workflow.add_conditional_edges(
            "agent",
            should_continue,
            {
                "continue": "action",
                END: END,
            },
        )
        workflow.add_edge("action", "agent")

        # Set the entry point
        workflow.set_entry_point("agent")

        return workflow.compile()

    async def run(
        self,
        input_text: str,
        chat_history: Optional[List[BaseMessage]] = None,
    ) -> Dict[str, Any]:
        """Run the agent with the given input."""
        try:
            # Initialize the state
            state = {
                "messages": (chat_history or []) + [HumanMessage(content=input_text)],
                "intermediate_steps": [],
            }

            # Run the graph
            result = await self.graph.ainvoke(state)
            return result
        except Exception as e:
            logger.error("Error running agent", error=str(e))
            raise 